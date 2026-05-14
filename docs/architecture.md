# Architecture Overview

## What it is

**offline-player** (internal name: *Poseidon*) is a macOS desktop application for managing and playing local audio files with optional cloud-storage integration. It is built with Go (backend) and React/TypeScript (frontend), bridged by the [Wails v2](https://wails.io) framework, which compiles both sides into a single native `.app` bundle.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Desktop framework | Wails v2 |
| Backend language | Go 1.21+ |
| Frontend language | TypeScript / React 18 |
| UI styling | Tailwind CSS 3 |
| Routing | React Router 7 |
| i18n | react-i18next (EN, DE, IT) |
| Plugin registry | SQLite via `github.com/mattn/go-sqlite3` |
| Other storage | coco-db (embedded binary, HTTP API on port 2022) — being replaced |
| Audio metadata | `github.com/dhowden/tag` |
| Build tool (frontend) | Vite 4 |

---

## Top-Level Directory Layout

```
offline-player/
├── main.go                   # Wails entry point, window config
├── app.go                    # App struct, lifecycle hooks, all Wails-bound methods
├── go.mod / go.sum
├── Makefile
├── wails.json
│
├── src/                      # Go source packages
│   ├── cocodb/               # Legacy JSON-file registry (fallback, mostly unused)
│   ├── config/               # AppBuilder, CLI flag parsing
│   ├── data/                 # App-data directory initialisation
│   ├── db/                   # DBManager + HTTP clients for coco-db; sqlite/ sub-package
│   │   └── sqlite/           # Generic SQLite opener (shared across all domains)
│   ├── digibox/              # Cloud storage: OAuth, Dropbox API, downloads, EventBus
│   ├── digitalitem/          # Audio metadata extraction
│   ├── playlist/             # Playlist & DigitalItem services + repositories
│   ├── plugins/              # Plugin manager, HTTP handlers, server
│   ├── primitive/            # Small string/number utilities
│   └── response/             # Unified JSON response helpers
│
├── frontend/                 # React/TypeScript application
│   ├── src/
│   │   ├── App.tsx           # Root component with React Router
│   │   ├── components/       # Feature and UI components
│   │   ├── api/              # Typed wrappers for Wails-bound Go methods
│   │   ├── config/           # RouteBuilder, MenuBuilder, plugin config
│   │   └── lib/              # Utilities, Poseidon bridge, Wails runtime types
│   └── wailsjs/              # Auto-generated Go→JS bindings
│
├── workspace/plugins/        # Plugin development workspace
│   └── namico/               # Example plugin (trends / charts)
│
├── build/                    # Build artefacts and macOS bundle config
│   ├── darwin/Info.plist
│   └── db/coco-db            # Database binary (bundled into .app)
│
├── scripts/                  # Platform build scripts
└── docs/                     # This documentation
```

---

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    macOS .app bundle                    │
│                                                         │
│  ┌──────────────────┐       ┌────────────────────────┐  │
│  │  React Frontend  │◄─────►│     Go Backend (app)   │  │
│  │  (Webview2/WKW)  │ Wails │  app.go + src/...      │  │
│  └──────────────────┘  IPC  └────────────┬───────────┘  │
│                                          │               │
│                          HTTP :2022      │               │
│                    ┌─────────────────────┘               │
│                    ▼                                     │
│            ┌──────────────┐                             │
│            │   coco-db    │  (subprocess, embedded)     │
│            │  (port 2022) │                             │
│            └──────────────┘                             │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  OAuth Callback Server (port 2014)               │   │
│  │  Plugin Static File Server                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Key processes at runtime

| Process | Port | Role |
|---|---|---|
| Wails app | — | Main UI + Go logic |
| coco-db | 2022 | Persistent storage for playlist, OAuth (subprocess — being replaced) |
| OAuth callback server | 2014 | Receives OAuth redirects, serves plugin assets |
| SQLite | — | Plugin registry (`plugins.db` in user-data dir, in-process) |

---

## Data Flow Summary

### Playlist operation

```
React UI
  → Wails IPC (e.g. CreatePlaylist)
    → PlaylistService.Create()
      → DBManager.Entries.InsertEntry("playlist", …)
        → HTTP POST localhost:2022
          ← JSON response
        ← PlaylistIndex struct
      ← JSON APIResponse{status, message}
    ← frontend updates UI
```

### OAuth / Dropbox authorization

```
User clicks "Connect Dropbox"
  → CreateAuthorizationLink(clientID, state)
    → Dropbox auth URL generated & opened in browser
      → User approves
        → Dropbox redirects to localhost:2014/oauth/callback
          → EventBus.Publish("oauth:code", {code, state})
            → AuthorizeWithCode() exchanges code for token
              → OauthTokenRepository.Insert()
                → DBManager.Entries.InsertEntry("oauth_token", …)
  → runtime.EventsEmit(ctx, "oauth:status", "success")
    → Frontend receives event, updates UI
```

### Plugin execution

```
Frontend calls window.callPluginBackend(pluginID, action, data)
  → Wails IPC → Go plugin HTTP handler
    → PluginManager.Call(pluginID, jsonPayload)
      → exec.Command(plugin binary)
        → write JSON to STDIN
          ← read JSON from STDOUT
      ← raw response bytes
    ← JSON response to frontend
```

---

## Design Principles

- **Repository pattern** — all data access behind typed repository structs.
- **Service pattern** — business logic in `PlaylistService`; no direct DB calls from `app.go`.
- **EventBus (pub/sub)** — OAuth callback decoupled from the authorization flow.
- **Process isolation** — backend plugins run as separate OS processes (no shared memory).
- **Single response format** — all Go→frontend calls return `{"status":"success"|"error","message":…}`.
