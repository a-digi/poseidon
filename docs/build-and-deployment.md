# Build & Deployment

## Prerequisites

- Go 1.21+
- Node.js 18+ / npm
- Wails CLI: `make install-wails` or `scripts/install-wails-cli.sh`
- macOS (arm64 or x86_64) — the app targets macOS only

---

## Common Makefile Targets

### Development

```sh
make run-dev
```

Builds the full app, then launches the binary with `--dev` and `--plugin-dir=$PWD/workspace/plugins`. Plugins in `workspace/plugins/` are loaded from the working directory instead of the user-data directory.

```sh
make run-terminal
```

Runs the already-built binary in the current terminal session (log output visible).

```sh
make run-app
```

Opens the built `.app` bundle in macOS GUI mode.

### Build

```sh
make build
```

Full build pipeline:

1. `cd frontend && npm install && npm run build` — compiles the React app to `frontend/dist/`.
2. `wails build` — embeds `frontend/dist/` and compiles the Go binary into `build/bin/offline-player.app`.
3. Copies `build/app_darwin_arm64/Info.plist` → `.app/Contents/Info.plist` (custom URL scheme).
4. Copies `src/cocodb/config.json` → `.app/Contents/Resources/config.json`.
5. Copies `build/db/coco-db` → `.app/Contents/Resources/coco-db`.

### Distribution

```sh
make dmg
```

Builds the app, then uses `hdiutil` to create a macOS DMG at `build/bin/offline-player-mac.dmg` with an Applications symlink for drag-and-drop installation.

```sh
make clone-desktop
```

Copies the DMG to `~/Desktop/` for easy distribution.

```sh
make run-sequence
```

Full cycle: uninstall → build DMG → copy to Applications → open. Useful for clean testing of a release build.

```sh
make run-sequence-arm64
```

Same as `run-sequence` but asserts the ARM64 build output exists.

### Clean / Uninstall

```sh
make clean
```

Removes `build/bin/offline-player.app` and the DMG. Runs `wails clean`.

```sh
make uninstall
```

Removes:
- `/Applications/offline-player.app`
- `~/Library/Application Support/offline-player`
- `~/.config/offline-player`
- `~/.local/share/offline-player`

### Code Quality

```sh
make lint-frontend      # eslint (report only)
make fix-frontend       # eslint --fix
```

### Plugin Development

```sh
make zip-plugin
```

Builds the `namico` example plugin (frontend + backend) and packages it as `~/Desktop/plugin.zip`.

### Diagnostics

```sh
make check-database       # Verifies coco-db is running on port 2022
make check-backend-server # Verifies the callback server is running on port 2014
```

---

## App Bundle Structure

After `make build`:

```
build/bin/offline-player.app/
└── Contents/
    ├── Info.plist           # macOS app metadata + custom URL scheme
    ├── MacOS/
    │   └── offline-player   # compiled Go binary (embeds frontend/dist)
    └── Resources/
        ├── coco-db          # database binary
        ├── config.json      # legacy cocodb config
        └── iconfile.icns
```

---

## Platform Build Scripts

Scripts in `scripts/` provide alternative build paths:

| Script | Target |
|---|---|
| `build-macos-arm.sh` | macOS arm64 |
| `build-macos-intel.sh` | macOS x86_64 |
| `build-macos.sh` | Universal macOS binary |
| `build-windows.sh` | Windows (experimental) |
| `build.sh` | Generic wrapper |

---

## Custom URL Scheme

The app registers the `offline-player://` URL scheme via `Info.plist`. When the OS opens a URL with this scheme, the binary receives it as `os.Args[1]` and stores it in `App.StartURL`, accessible from the frontend via `GetStartURL()`.

---

## Data Directory

| Mode | Path |
|---|---|
| Production | `~/Library/Application Support/poseidon/` |
| Dev (`--dev`) | Configurable via `--data-dir=<path>` flag |

The coco-db binary is copied here on first launch and started from this location on every subsequent run.
