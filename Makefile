# Makefile for Wails macOS build and DMG creation

APP_NAME=t-digi-posseidon
# DATA_NAME mirrors appName in app.go (app.go:44); intentionally differs from the bundle name
DATA_NAME=poseidon
VERSION    := $(shell cat VERSION)
COMMIT     := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
BUILD_DATE := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS    := -X 'main.appVersion=$(VERSION)' -X 'main.appCommit=$(COMMIT)' -X 'main.appBuildDate=$(BUILD_DATE)'
APP_BUNDLE=build/bin/$(APP_NAME).app
DMG_NAME=build/bin/$(APP_NAME)-mac.dmg
DMG_TMP=build/dmg-tmp

.PHONY: all
all: build

.PHONY: frontend
frontend:
	cd frontend && npm install
	cd frontend && npm run build

# Copy config.json into the .app bundle (Resources) after every build
.PHONY: post-build
post-build:
	cp src/cocodb/config.json build/bin/$(APP_NAME).app/Contents/Resources/config.json || true

# Copy Info.plist into the .app bundle after every build (for the custom URL protocol)
.PHONY: copy-plist
copy-plist:
	@if [ -f build/app_darwin_arm64/Info.plist ]; then \
		cp build/app_darwin_arm64/Info.plist build/bin/$(APP_NAME).app/Contents/Info.plist; \
	fi

# Copy the database binary into the .app bundle (Resources) after every build
.PHONY: post-build-db
post-build-db:
	cp build/db/* build/bin/$(APP_NAME).app/Contents/Resources/ || true

# Copy coco-db into the .app bundle (Resources) after every build
.PHONY: post-build-cocodb
post-build-cocodb:
	cp build/db/coco-db build/bin/$(APP_NAME).app/Contents/Resources/coco-db || true

.PHONY: build
build: frontend
	wails build -ldflags "$(LDFLAGS)"
	$(MAKE) copy-plist
	$(MAKE) post-build
	$(MAKE) post-build-db
	$(MAKE) post-build-cocodb

.PHONY: dmg
dmg: build
	@echo "Creating DMG image with Applications shortcut..."
	rm -rf $(DMG_TMP)
	mkdir -p $(DMG_TMP)
	cp -R $(APP_BUNDLE) $(DMG_TMP)/
	ln -s /Applications $(DMG_TMP)/Applications
	rm -f $(DMG_NAME)
	hdiutil create -volname "$(APP_NAME)" -srcfolder $(DMG_TMP) -ov -format UDZO $(DMG_NAME)
	rm -rf $(DMG_TMP)
	@echo "DMG created: $(DMG_NAME)"

.PHONY: clone-desktop
clone-desktop:
	@echo "Copying DMG to Desktop..."
	cp $(DMG_NAME) ~/Desktop/$(APP_NAME)-mac.dmg
	@echo "DMG copied to Desktop."

.PHONY: run-terminal
run-terminal:
	@if [ -f build/bin/$(APP_NAME).app/Contents/MacOS/$(APP_NAME) ]; then \
		echo "Starting $(APP_NAME) in terminal (with logs):"; \
		build/bin/$(APP_NAME).app/Contents/MacOS/$(APP_NAME); \
	else \
		echo "[ERROR] Binary build/bin/$(APP_NAME).app/Contents/MacOS/$(APP_NAME) does not exist! Please run 'make build'."; \
	fi

.PHONY: run-app
run-app:
	@echo "Starting app from the .app bundle (GUI mode):"
	open $(APP_BUNDLE)

.PHONY: run-app-terminal
run-app-terminal:
	@if [ -f /Applications/$(APP_NAME).app/Contents/MacOS/$(APP_NAME) ]; then \
		echo "Starting /Applications/$(APP_NAME).app/Contents/MacOS/$(APP_NAME) in terminal (with logs):"; \
		/Applications/$(APP_NAME).app/Contents/MacOS/$(APP_NAME); \
	else \
		echo "[ERROR] Binary /Applications/$(APP_NAME).app/Contents/MacOS/$(APP_NAME) does not exist! Please install the app to /Applications."; \
	fi

.PHONY: run-dev
run-dev: build
	build/bin/$(APP_NAME).app/Contents/MacOS/$(APP_NAME) --dev --plugin-dir="${PWD}/workspace/plugins"

.PHONY: clean
clean:
	rm -rf build/bin/$(APP_NAME).app $(DMG_NAME)
	wails clean

.PHONY: uninstall
uninstall:
	@echo "[INFO] Uninstalling t-digi-posseidon ..."
	@if [ -d /Applications/$(APP_NAME).app ]; then \
		echo "[INFO] Removing /Applications/$(APP_NAME).app"; \
		rm -rf /Applications/$(APP_NAME).app; \
	else \
		echo "[INFO] /Applications/$(APP_NAME).app not found."; \
	fi
	@if [ -d "$$HOME/Library/Application Support/$(DATA_NAME)" ]; then \
		echo "[INFO] Removing $$HOME/Library/Application Support/$(DATA_NAME)"; \
		rm -rf "$$HOME/Library/Application Support/$(DATA_NAME)"; \
	else \
		echo "[INFO] $$HOME/Library/Application Support/$(DATA_NAME) not found."; \
	fi
	@if [ -d "$$HOME/.config/$(DATA_NAME)" ]; then \
		echo "[INFO] Removing $$HOME/.config/$(DATA_NAME)"; \
		rm -rf "$$HOME/.config/$(DATA_NAME)"; \
	else \
		echo "[INFO] $$HOME/.config/$(DATA_NAME) not found."; \
	fi
	@if [ -d "$$HOME/.local/share/$(DATA_NAME)" ]; then \
		echo "[INFO] Removing $$HOME/.local/share/$(DATA_NAME)"; \
		rm -rf "$$HOME/.local/share/$(DATA_NAME)"; \
	else \
		echo "[INFO] $$HOME/.local/share/$(DATA_NAME) not found."; \
	fi
	@echo "[INFO] Uninstall complete."

.PHONY: run-sequence
run-sequence:
	$(MAKE) uninstall
	$(MAKE) dmg
	$(MAKE) clone-desktop
	@echo "Copying app directly to /Applications ..."
	@if [ -d /Applications/$(APP_NAME).app ]; then \
		rm -rf /Applications/$(APP_NAME).app; \
	fi
	cp -R $(APP_BUNDLE) /Applications/$(APP_NAME).app
	@echo "App copied to /Applications/$(APP_NAME).app."
	codesign --force --deep --sign - /Applications/$(APP_NAME).app
	@echo "Starting app ..."
	open /Applications/$(APP_NAME).app

.PHONY: run-sequence-arm64
run-sequence-arm64:
	$(MAKE) uninstall
	$(MAKE) dmg
	$(MAKE) clone-desktop
	@echo "Copying ARM64 app directly to /Applications ..."
	@if [ -d /Applications/$(APP_NAME).app ]; then \
		rm -rf /Applications/$(APP_NAME).app; \
	fi
	@if [ -d build/app_darwin_arm64 ]; then \
		cp -R build/bin/$(APP_NAME).app /Applications/$(APP_NAME).app; \
		echo "ARM64 app copied to /Applications/$(APP_NAME).app."; \
	else \
		echo "[ERROR] ARM64 build not found! Please run 'make build'."; \
		exit 1; \
	fi
	codesign --force --deep --sign - /Applications/$(APP_NAME).app
	@echo "Starting ARM64 app ..."
	open /Applications/$(APP_NAME).app

# ── macOS architecture builds ──────────────────────────────────────────────────

.PHONY: build-amd64
build-amd64: frontend
	wails build -platform darwin/amd64 -ldflags "$(LDFLAGS)"
	rm -rf build/bin/$(APP_NAME)-amd64.app
	cp -R $(APP_BUNDLE) build/bin/$(APP_NAME)-amd64.app
	$(MAKE) copy-plist
	$(MAKE) post-build
	$(MAKE) post-build-db
	$(MAKE) post-build-cocodb
	@echo "amd64 build: build/bin/$(APP_NAME)-amd64.app"

.PHONY: build-arm64
build-arm64: frontend
	wails build -platform darwin/arm64 -ldflags "$(LDFLAGS)"
	rm -rf build/bin/$(APP_NAME)-arm64.app
	cp -R $(APP_BUNDLE) build/bin/$(APP_NAME)-arm64.app
	$(MAKE) copy-plist
	$(MAKE) post-build
	$(MAKE) post-build-db
	$(MAKE) post-build-cocodb
	@echo "arm64 build: build/bin/$(APP_NAME)-arm64.app"

# Builds arm64 and amd64 then lipo-merges the binaries into a single universal bundle.
# After build-arm64, $(APP_BUNDLE) already holds the arm64 build — lipo replaces the binary in-place.
.PHONY: build-universal
build-universal:
	$(MAKE) build-amd64
	$(MAKE) build-arm64
	lipo -create \
		build/bin/$(APP_NAME)-amd64.app/Contents/MacOS/$(APP_NAME) \
		build/bin/$(APP_NAME)-arm64.app/Contents/MacOS/$(APP_NAME) \
		-output $(APP_BUNDLE)/Contents/MacOS/$(APP_NAME)
	@echo "Universal binary: $(APP_BUNDLE)"

# ── Release ────────────────────────────────────────────────────────────────────

RELEASE_DIR := $(CURDIR)/app

.PHONY: release release-patch release-minor release-major
release:
	@$(MAKE) _bump-release BUMP=patch

release-patch:
	@$(MAKE) _bump-release BUMP=patch

release-minor:
	@$(MAKE) _bump-release BUMP=minor

release-major:
	@$(MAKE) _bump-release BUMP=major

.PHONY: _preflight-release
_preflight-release:
	@command -v gh >/dev/null 2>&1 || { echo "[ERROR] 'gh' is required. Install with: brew install gh"; exit 1; }
	@gh auth status >/dev/null 2>&1 || { echo "[ERROR] 'gh' is not authenticated. Run: gh auth login"; exit 1; }

.PHONY: _bump-release
_bump-release:
	@$(MAKE) _preflight-release
	@CURRENT=$$(cat VERSION); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT | cut -d. -f3); \
	if [ "$(BUMP)" = "major" ]; then NEW="$$((MAJOR+1)).0.0"; \
	elif [ "$(BUMP)" = "minor" ]; then NEW="$$MAJOR.$$((MINOR+1)).0"; \
	else NEW="$$MAJOR.$$MINOR.$$((PATCH+1))"; fi; \
	echo "$$CURRENT → $$NEW"; \
	echo "$$NEW" > VERSION; \
	$(MAKE) _release-build; \
	BRANCH=$$(git rev-parse --abbrev-ref HEAD); \
	git -C $(CURDIR) add .; \
	git commit -m "v$$NEW"; \
	git push origin $$BRANCH; \
	git tag "v$$NEW"; \
	git push --tags; \
	gh release create "v$$NEW" $(RELEASE_DIR)/$(APP_NAME)-darwin-arm64.dmg $(RELEASE_DIR)/$(APP_NAME)-darwin-amd64.dmg $(RELEASE_DIR)/$(APP_NAME)-darwin-universal.dmg $(RELEASE_DIR)/$(APP_NAME)-windows-amd64.exe $(RELEASE_DIR)/SHA256SUMS --title "v$$NEW" --generate-notes; \
	echo "✓ v$$NEW released — tagged, pushed, and published on GitHub"

# Linux cross-compilation of the Wails host app is not supported from macOS
# (requires WebKit2GTK headers). Build on a native Linux host instead.
.PHONY: _release-build
_release-build:
	@echo "Building all platform releases..."
	$(MAKE) build-universal
	$(MAKE) build-windows
	@mkdir -p $(RELEASE_DIR)
	@echo "Packaging macOS bundles as DMGs..."
	rm -f $(RELEASE_DIR)/$(APP_NAME)-darwin-arm64.dmg
	rm -f $(RELEASE_DIR)/$(APP_NAME)-darwin-amd64.dmg
	rm -f $(RELEASE_DIR)/$(APP_NAME)-darwin-universal.dmg
	rm -rf $(DMG_TMP) && mkdir -p $(DMG_TMP) && \
		cp -R build/bin/$(APP_NAME)-arm64.app $(DMG_TMP)/ && \
		ln -s /Applications $(DMG_TMP)/Applications && \
		hdiutil create -volname "$(APP_NAME)" -srcfolder $(DMG_TMP) -ov -format UDZO $(RELEASE_DIR)/$(APP_NAME)-darwin-arm64.dmg && \
		rm -rf $(DMG_TMP)
	rm -rf $(DMG_TMP) && mkdir -p $(DMG_TMP) && \
		cp -R build/bin/$(APP_NAME)-amd64.app $(DMG_TMP)/ && \
		ln -s /Applications $(DMG_TMP)/Applications && \
		hdiutil create -volname "$(APP_NAME)" -srcfolder $(DMG_TMP) -ov -format UDZO $(RELEASE_DIR)/$(APP_NAME)-darwin-amd64.dmg && \
		rm -rf $(DMG_TMP)
	rm -rf $(DMG_TMP) && mkdir -p $(DMG_TMP) && \
		cp -R build/bin/$(APP_NAME).app $(DMG_TMP)/ && \
		ln -s /Applications $(DMG_TMP)/Applications && \
		hdiutil create -volname "$(APP_NAME)" -srcfolder $(DMG_TMP) -ov -format UDZO $(RELEASE_DIR)/$(APP_NAME)-darwin-universal.dmg && \
		rm -rf $(DMG_TMP)
	@echo "Copying Windows executable..."
	cp build/bin/$(APP_NAME)-windows-amd64.exe $(RELEASE_DIR)/$(APP_NAME)-windows-amd64.exe
	@echo "Release artefacts in $(RELEASE_DIR):"
	@ls -lh $(RELEASE_DIR)
	@echo "Generating SHA256SUMS..."
	cd $(RELEASE_DIR) && shasum -a 256 \
		$(APP_NAME)-darwin-arm64.dmg \
		$(APP_NAME)-darwin-amd64.dmg \
		$(APP_NAME)-darwin-universal.dmg \
		$(APP_NAME)-windows-amd64.exe \
		$(if $(wildcard $(RELEASE_DIR)/$(APP_NAME)-linux-amd64),$(APP_NAME)-linux-amd64,) \
		> SHA256SUMS
	@echo "SHA256SUMS written to $(RELEASE_DIR)/SHA256SUMS"

# ── Cross-platform builds ───────────────────────────────────────────────────────

.PHONY: install-cross-deps
install-cross-deps:
	@echo "Installing cross-compilation toolchain via Homebrew..."
	brew install zig
	@echo "Cross-compilation toolchain installed."

.PHONY: build-linux
build-linux: frontend
	CGO_ENABLED=1 CC='zig cc -target x86_64-linux-musl' \
		wails build -platform linux/amd64 -o $(APP_NAME)-linux-amd64 -ldflags "$(LDFLAGS)"
	@echo "Linux build: build/bin/$(APP_NAME)-linux-amd64"

.PHONY: build-windows
build-windows: frontend
	CGO_ENABLED=1 CC='zig cc -target x86_64-windows-gnu' \
		wails build -platform windows/amd64 -o $(APP_NAME)-windows-amd64.exe -ldflags "$(LDFLAGS)"
	@echo "Windows build: build/bin/$(APP_NAME)-windows-amd64.exe"

# ───────────────────────────────────────────────────────────────────────────────

.PHONY: lint-frontend
lint-frontend:
	cd frontend && npx eslint src --ext .js,.jsx,.ts,.tsx

.PHONY: fix-frontend
fix-frontend:
	cd frontend && npx eslint src --ext .js,.jsx,.ts,.tsx --fix

.PHONY: check-database
check-database:
	@echo "Checking if the database is running on port 2022 ..."
	@if lsof -i :2022 | grep coco-db > /dev/null; then \
		echo "[OK] coco-db is running on port 2022."; \
		lsof -i :2022 | grep coco-db; \
	else \
		echo "[WARN] No database (coco-db) found on port 2022."; \
	fi

.PHONY: check-backend-server
check-backend-server:
	@echo "Checking if the backend server is running on port 2014 ..."
	@if lsof -i :2014 | grep LISTEN > /dev/null; then \
		echo "[OK] Backend server is running on port 2014."; \
		lsof -i :2014 | grep LISTEN; \
	else \
		echo "[WARN] No backend server found on port 2014."; \
	fi

.PHONY: verify-notarization
verify-notarization:
	@scripts/verify-notarization.sh $(APP)
