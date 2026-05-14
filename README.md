# t-digi-poseidon

A [Wails](https://wails.io) desktop application (macOS / Linux / Windows) with a plugin architecture. Each plugin runs as an isolated backend process and renders its own frontend inside the host app.

## Plugins

| Plugin | Description |
|---|---|
| `digibox` | Digibox integration |
| `mhype` | Music Hype — chart tracking across Billboard, Shazam, and more |
| `music` | Music utilities |
| `snake` | Snake game |

---

## Prerequisites

- [Go 1.26+](https://go.dev/dl/) — required by both the host app and all plugin Go backends
- [Node.js 18+](https://nodejs.org/)
- [Wails CLI v2](https://wails.io/docs/gettingstarted/installation) — `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

---

## Development

```sh
# Install frontend dependencies and start the dev server (hot-reload)
wails dev
```

---

## Building plugins

Each plugin is a self-contained unit with its own Go backend and frontend. They are built independently from the host app using the plugin's own Makefile under `plugins/<name>/app/`.

### Build a single plugin (backend + frontend)

```sh
make -C plugins/mhype/app      # Music Hype
make -C plugins/music/app      # Music
make -C plugins/digibox/app    # Digibox
```

Individual targets are also available:

```sh
make -C plugins/mhype/app backend    # Go binary only
make -C plugins/mhype/app frontend   # npm build only
```

### Package a plugin as a ZIP

`make zip` produces one ZIP per supported OS/architecture. The host app detects `GOOS/GOARCH` at runtime and downloads the matching ZIP from the marketplace catalog.

```sh
make -C plugins/mhype/app zip      # Music Hype — all platforms
make -C plugins/music/app zip      # Music — all platforms
make -C plugins/digibox/app zip    # Digibox — all platforms
```

Output per platform: `plugins/<name>/app/dist/<id>_<version>_<os>-<arch>.zip`

Individual platform targets are also available if you need just one:

```sh
make -C plugins/mhype/app zip-darwin-arm64
make -C plugins/mhype/app zip-darwin-amd64
make -C plugins/mhype/app zip-linux-amd64
make -C plugins/mhype/app zip-windows-amd64
```

The `music` and `digibox` plugins use SQLite (cgo) and require [Zig](https://ziglang.org/) for Linux and Windows cross-compilation — run `make install-cross-deps` once before building those. The `mhype` plugin is pure Go and cross-compiles without any extra toolchain.

### Marketplace catalog format

Remote plugin repositories serve an `index.json` file. Each plugin entry declares which platforms it supports and provides a per-platform download path.

```json
{
  "version": 2,
  "title": "My Repo",
  "description": "Plugin repository",
  "plugins": [
    {
      "id": "mhype",
      "name": "Music Hype",
      "version": "1.0.14",
      "description": "...",
      "author": "...",
      "tags": ["Music"],
      "supported": ["darwin/arm64", "darwin/amd64", "linux/amd64", "windows/amd64"],
      "download": [
        { "os": "darwin/arm64",  "path": "apps/mhype/mhype_1-0-14_darwin-arm64.zip" },
        { "os": "darwin/amd64",  "path": "apps/mhype/mhype_1-0-14_darwin-amd64.zip" },
        { "os": "linux/amd64",   "path": "apps/mhype/mhype_1-0-14_linux-amd64.zip" },
        { "os": "windows/amd64", "path": "apps/mhype/mhype_1-0-14_windows-amd64.zip" }
      ]
    }
  ]
}
```

- **`supported`** — platforms in `<goos>/<goarch>` format. The marketplace only shows plugins whose `supported` list includes the running host's platform.
- **`download`** — array of `{os, path}` objects. `path` is relative to the repository base URL. The host picks the entry matching its `runtime.GOOS + "/" + runtime.GOARCH`.
- UI-only plugins that ship a single ZIP list all supported platforms with the same path.

---

## Building the host app

### macOS — host architecture

Builds the Wails host app for whichever architecture the machine running the command uses. **Does not compile plugin backends** — build plugins separately with `make -C plugins/<name>/app`.

```sh
make build
```

Output: `build/bin/t-digi-posseidon.app`

### macOS — Intel (amd64)

```sh
make build-amd64
```

Output: `build/bin/t-digi-posseidon-amd64.app`

### macOS — Apple Silicon (arm64)

```sh
make build-arm64
```

Output: `build/bin/t-digi-posseidon-arm64.app`

### macOS — Universal binary (amd64 + arm64)

Builds both architectures and merges them into a single fat binary using `lipo`. The result runs natively on both Intel and Apple Silicon.

```sh
make build-universal
```

Output: `build/bin/t-digi-posseidon.app` (universal)

---

## Cross-platform builds

### Windows (amd64)

Cross-compiling to Windows uses [Zig](https://ziglang.org/) as the C cross-compiler. Install it once with:

```sh
make install-cross-deps   # brew install zig
```

```sh
make build-windows
```

Output: `build/bin/t-digi-posseidon-windows-amd64.exe`

### Linux (amd64)

> **Note:** Cross-compiling the Wails host app to Linux from macOS is not supported — Wails requires WebKit2GTK headers which are only available on Linux. Run `make build-linux` on a native Linux host.

```sh
make build-linux
```

Output: `build/bin/t-digi-posseidon-linux-amd64`

---

## Installation

Download the latest release from [GitHub Releases](https://github.com/a-digi/poseidon/releases/latest).

---

### macOS

**Step 1 — pick the right DMG for your chip:**

| Your Mac | File to download |
|---|---|
| Apple Silicon (M1 / M2 / M3 / M4) | `t-digi-posseidon-darwin-arm64.dmg` |
| Intel | `t-digi-posseidon-darwin-amd64.dmg` |
| Either (larger, runs natively on both) | `t-digi-posseidon-darwin-universal.dmg` |

Not sure which chip you have? Apple menu → **About This Mac** — look for "Apple M…" (Silicon) or "Intel" in the chip/processor line.

**Step 2 — install:**

1. Double-click the `.dmg` to mount it.
2. Drag **t-digi-posseidon** into the **Applications** shortcut.
3. Eject the disk image.

**Step 3 — first launch (Gatekeeper warning)**

Because the release builds are ad-hoc signed and not yet notarized, macOS will block the first launch with:

> "Apple could not verify that t-digi-posseidon is free from malware…"

Pick one of these workarounds:

1. **Right-click → Open** — Control-click (or right-click) the app in `/Applications` and choose **Open**. Confirm in the dialog. Subsequent double-clicks work normally.
2. **System Settings → Privacy & Security** — after the first blocked attempt, scroll to the bottom of this pane and click **Open Anyway**.
3. **Terminal** — strip the quarantine attribute from the installed app:

   ```sh
   # Apple Silicon DMG
   xattr -dr com.apple.quarantine /Applications/t-digi-posseidon.app

   # Intel DMG
   xattr -dr com.apple.quarantine /Applications/t-digi-posseidon.app

   # Universal DMG
   xattr -dr com.apple.quarantine /Applications/t-digi-posseidon.app
   ```

   Or strip it from the DMG before opening (if Gatekeeper blocks the mount itself):

   ```sh
   # Apple Silicon
   xattr -dr com.apple.quarantine ~/Downloads/t-digi-posseidon-darwin-arm64.dmg

   # Intel
   xattr -dr com.apple.quarantine ~/Downloads/t-digi-posseidon-darwin-amd64.dmg

   # Universal
   xattr -dr com.apple.quarantine ~/Downloads/t-digi-posseidon-darwin-universal.dmg
   ```

**Permanent fix:** sign with an Apple Developer ID certificate and notarize via `xcrun notarytool` (requires a paid Apple Developer account).

---

### Windows

1. Download `t-digi-posseidon-windows-amd64.exe` from the release page.
2. Double-click the `.exe` to run it directly — no installer needed.
3. If Windows SmartScreen shows a warning ("Windows protected your PC"), click **More info → Run anyway**. This appears because the binary is not yet code-signed.

> The app stores its data in `%APPDATA%\poseidon`.

---

### Linux

1. Download `t-digi-posseidon-linux-amd64` from the release page.
2. Make it executable and run:

   ```sh
   chmod +x t-digi-posseidon-linux-amd64
   ./t-digi-posseidon-linux-amd64
   ```

3. To install system-wide:

   ```sh
   sudo mv t-digi-posseidon-linux-amd64 /usr/local/bin/t-digi-posseidon
   ```

> The app stores its data in `~/.local/share/poseidon`.

---

## Releasing a new version

Version bumping, tagging, and building are handled by a single `make` command:

```sh
make release        # bump patch  (1.0.3 → 1.0.4)  ← default
make release-patch  # same as above
make release-minor  # bump minor  (1.0.3 → 1.1.0)
make release-major  # bump major  (1.0.3 → 2.0.0)
```

Each command:
1. Guards against a dirty working tree.
2. Increments `VERSION`, commits it, creates a `v<version>` git tag, and pushes both to the remote.
3. Builds all platform artefacts into `app/`.
4. Writes a `app/SHA256SUMS` checksum file.

The GitHub Release is created and artifacts uploaded automatically at the end of each `make release*` run. This requires the `gh` CLI to be installed and authenticated once before your first release:

```sh
brew install gh
gh auth login
```

Output in `app/`:

| File | Platform |
|---|---|
| `t-digi-posseidon-darwin-arm64.dmg` | macOS Apple Silicon |
| `t-digi-posseidon-darwin-amd64.dmg` | macOS Intel |
| `t-digi-posseidon-darwin-universal.dmg` | macOS Universal |
| `t-digi-posseidon-windows-amd64.exe` | Windows |
| `SHA256SUMS` | Checksums for all artefacts |

> Linux must be built on a native Linux host (`make build-linux`). Add the resulting `t-digi-posseidon-linux-amd64` binary to the GitHub release manually.

---

## Other commands

| Command | Description |
|---|---|
| `make run-dev` | Build and launch with `--dev` flag and local plugin directory |
| `make run-app` | Open the already-built `.app` bundle |
| `make clean` | Remove build artefacts |
| `make uninstall` | Remove app from `/Applications` and all app data |
| `make lint-frontend` | Run ESLint on the frontend |
| `make fix-frontend` | Run ESLint with auto-fix |
| `make check-database` | Check if `coco-db` is listening on port 2022 |
| `make check-backend-server` | Check if the backend server is listening on port 2014 |
