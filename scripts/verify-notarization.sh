#!/usr/bin/env bash
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Colour helpers — emit ANSI only when stdout is a TTY
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; RESET='\033[0m'
else
  GREEN=''; YELLOW=''; RED=''; CYAN=''; RESET=''
fi

OK=0; WARN=0; FAIL=0

pass()    { echo -e "${GREEN}[OK]${RESET}   $*";   (( OK++   )); }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; (( WARN++ )); }
fail()    { echo -e "${RED}[FAIL]${RESET} $*";   (( FAIL++ )); }
info()    { echo -e "${CYAN}[INFO]${RESET} $*"; }
section() { echo; echo "── $* ──"; }

# ── 1. Locate the .app bundle ──────────────────────────────────────────────────
section "Bundle"
if [[ -n "${1-}" ]]; then
  APP="$1"
elif [[ -d "build/bin/t-digi-posseidon.app" ]]; then
  APP="build/bin/t-digi-posseidon.app"
else
  FIRST="$(find build/bin -maxdepth 1 -name '*.app' | head -1)"
  if [[ -z "$FIRST" ]]; then
    fail "No .app bundle found in build/bin/ and no path supplied"
    echo; echo "Total: 1  OK: 0  WARN: 0  FAIL: 1"
    exit 1
  fi
  APP="$FIRST"
  info "Multiple bundles possible — using: $APP"
fi

if [[ ! -d "$APP" ]]; then
  fail "Bundle not found: $APP"
  echo; echo "Total: 1  OK: 0  WARN: 0  FAIL: 1"
  exit 1
fi
pass "Bundle located: $APP"

# ── 2. Signature presence and signing authority ────────────────────────────────
section "Signing authority (codesign -dv --verbose=4)"
CODESIGN_INFO="$(codesign -dv --verbose=4 "$APP" 2>&1)" || true

if echo "$CODESIGN_INFO" | grep -q "code object is not signed"; then
  fail "App is not codesigned — skipping remaining codesign checks"
  SIGNED=0
elif echo "$CODESIGN_INFO" | grep -q "Authority=Developer ID Application:"; then
  pass "Signed with Developer ID Application certificate (notarization-eligible)"
  SIGNED=1
elif echo "$CODESIGN_INFO" | grep -q "Authority=Apple Development:"; then
  warn "Signed with a Personal Team (Apple Development) certificate — Apple will reject notarization; a paid Developer ID is required"
  SIGNED=1
else
  AUTHORITY="$(echo "$CODESIGN_INFO" | grep 'Authority=' | head -1 || echo 'unknown')"
  warn "Signed with an unrecognised authority ($AUTHORITY) — likely self-signed or ad-hoc; Apple will reject notarization"
  SIGNED=1
fi

if [[ "$SIGNED" -eq 1 ]]; then
  # ── 3. Signature chain consistency ──────────────────────────────────────────
  section "Signature chain (codesign --verify --deep --strict)"
  if codesign --verify --deep --strict --verbose=2 "$APP" 2>&1 | grep -q "satisfies its Designated Requirement\|valid on disk"; then
    pass "Signature chain is internally consistent"
  else
    VERIFY_OUT="$(codesign --verify --deep --strict --verbose=2 "$APP" 2>&1)"
    if [[ $? -eq 0 ]]; then
      pass "Signature chain is internally consistent"
    else
      fail "Signature chain verification failed: $VERIFY_OUT"
    fi
  fi

  # ── 4. Entitlements ──────────────────────────────────────────────────────────
  section "Entitlements (codesign -d --entitlements -)"
  ENT_OUT="$(codesign -d --entitlements - "$APP" 2>&1)" || true
  if echo "$ENT_OUT" | grep -q "com.apple.security.cs.disable-library-validation"; then
    warn "Entitlement com.apple.security.cs.disable-library-validation is set — Apple may reject or flag this without a documented exception"
  fi
  if echo "$ENT_OUT" | grep -q "com.apple.security.cs.allow-unsigned-executable-memory"; then
    warn "Entitlement com.apple.security.cs.allow-unsigned-executable-memory is set — Apple may reject or flag this without a documented exception"
  fi
  if ! echo "$ENT_OUT" | grep -q "com.apple.security.cs.disable-library-validation\|com.apple.security.cs.allow-unsigned-executable-memory"; then
    pass "No hard-block entitlements found"
  fi

  # ── 5. Hardened runtime ───────────────────────────────────────────────────────
  section "Hardened runtime (codesign -dv flags)"
  # The runtime flag appears as "flags=0x..." with bit 0x10000 (runtime hardening) set.
  FLAGS_LINE="$(echo "$CODESIGN_INFO" | grep '^flags=' || true)"
  FLAGS_HEX="$(echo "$FLAGS_LINE" | sed 's/flags=0x//' | awk '{print $1}')"
  if [[ -n "$FLAGS_HEX" ]]; then
    FLAGS_DEC=$(( 16#$FLAGS_HEX ))
    # Bit 0x10000 = 65536 = hardened runtime
    if (( FLAGS_DEC & 65536 )); then
      pass "Hardened runtime is enabled (flags=0x${FLAGS_HEX})"
    else
      fail "Hardened runtime is NOT enabled (flags=0x${FLAGS_HEX}) — required for notarization; re-sign with --options runtime"
    fi
  else
    fail "Could not determine runtime flags — hardened runtime status unknown"
  fi

  # ── 6. Gatekeeper assessment (spctl) ─────────────────────────────────────────
  section "Gatekeeper (spctl --assess --type execute)"
  SPCTL_OUT="$(spctl --assess --type execute --verbose "$APP" 2>&1)" || true
  if echo "$SPCTL_OUT" | grep -q "accepted"; then
    pass "Gatekeeper: accepted"
  elif echo "$SPCTL_OUT" | grep -q "source=Unnotarized Developer ID"; then
    # Correct shape: Developer ID cert + valid signature, just not yet submitted to Apple's notarization service
    pass "Gatekeeper: signature shape is correct (Unnotarized Developer ID) — notarization ticket not yet stapled, which is expected pre-notarization"
  else
    REASON="$(echo "$SPCTL_OUT" | grep -v '^$' | head -2 | tr '\n' ' ')"
    fail "Gatekeeper rejected: $REASON"
  fi
fi

# ── 7. Notarization ticket (xcrun stapler) ────────────────────────────────────
section "Notarization ticket (xcrun stapler validate)"
STAPLER_OUT="$(xcrun stapler validate "$APP" 2>&1)" || true
if echo "$STAPLER_OUT" | grep -qi "The validate action worked\|ticket"; then
  if echo "$STAPLER_OUT" | grep -qi "worked\|successfully"; then
    pass "Notarization ticket is already stapled"
  else
    info "No notarization ticket (expected pre-notarization)"
  fi
else
  info "No notarization ticket (expected pre-notarization)"
fi

# ── Summary ────────────────────────────────────────────────────────────────────
echo
TOTAL=$(( OK + WARN + FAIL ))
echo "Total: $TOTAL  OK: $OK  WARN: $WARN  FAIL: $FAIL"
echo
echo "Note: local checks are necessary but not sufficient — Apple's notarization service"
echo "also runs malware scans and additional policy checks that cannot be replicated locally."

if (( FAIL > 0 )); then
  exit 1
fi
exit 0
