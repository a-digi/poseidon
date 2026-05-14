# Database

## Overview

All application data is stored in **SQLite** (in-process). The migration from coco-db is complete for all data domains. coco-db (the HTTP subprocess) and the legacy `cocodb` JSON registry are still present in `src/db/` and `src/cocodb/` but are no longer used for application data — removal is tracked as Phase 5.

| Domain | Storage | File |
|---|---|---|
| Plugin registry | SQLite ✅ | `plugins.db` |
| Playlists | SQLite ✅ | `poseidon.db` |
| OAuth clients, tokens, requests, profiles | SQLite ✅ | `poseidon.db` |
| Downloads | SQLite ✅ | `poseidon.db` |

---

## SQLite (`src/db/sqlite/`)

`src/db/sqlite/db.go` is the shared entry point for all SQLite connections across the app. It is intentionally thin — it only opens the connection and registers the driver. Schema creation is the responsibility of each domain's own repository.

```go
sqlite.Open(dataDir, "plugins.db")  // returns *sql.DB
```

The driver used is `github.com/mattn/go-sqlite3` (CGO-based, already available via Wails).

Each domain repository calls `NewXxxRepository(db *sql.DB)` which runs its own `CREATE TABLE IF NOT EXISTS` on startup.

---

## SQLite files

| File | Location | Contents |
|---|---|---|
| `poseidon.db` | `<userDataDir>/poseidon.db` | playlists, playlist items, OAuth clients/tokens/requests/profiles, downloads |
| `plugins.db` | `<userDataDir>/plugins.db` | plugin registry (opened by the OAuth callback server) |

Both files are created automatically on first launch. Each repository runs `CREATE TABLE IF NOT EXISTS` in its constructor — no separate migration tool is needed.

---

## coco-db Binary

The binary is bundled inside the `.app` bundle at:

```
offline-player.app/Contents/Resources/coco-db
```

On first launch, the app copies it to the user-data directory:

```
~/Library/Application Support/poseidon/db/coco-db
```

It is then started with:

```
coco-db start --data-dir=<userDataDir>/db
```

with environment variables `DB_PORT=5432` and `DB_DATA_DIR`.

---

## DBManager (`src/db/dbmanager.go`)

`DBManager` is the single entry point for all database operations. It bundles five sub-clients:

```go
type DBManager struct {
    Client              *Client              // raw HTTP client
    Database            *DatabaseClient      // create/drop database
    Table               *TableClient         // create/list/drop tables
    Entries             *EntriesClient       // CRUD on rows
    Search              *SearchClient        // full-text / filter search
    DbName              string
    QueryBuilderFactory *QueryBuilderFactory
}
```

Constructed with:

```go
db.NewDBManager("localhost", 2022, 5*time.Second, "poseidon")
```

---

## Startup Sequence

The startup sequence in `app.go` is intentional and ordered:

1. **`EnsureDatabaseShutdownAndRestart`** — if a stale coco-db PID file exists, kill the old process, wait for port 2022 to be free, then start a fresh instance.
2. **Block on channel** — wait until coco-db is accepting TCP connections on port 2022.
3. **`CreateDatabase("poseidon")`** — idempotent: creates the database if it doesn't exist yet.
4. **`Client.Ping()`** — health check before proceeding.

On shutdown, `ShutdownDatabaseBinary` sends SIGTERM, waits up to 5 seconds, then SIGKILL.

---

## HTTP Client (`src/db/client.go`)

`Client` wraps `net/http` and provides a `Ping()` method. All sub-clients hold a reference to the same `*Client` instance.

---

## EntriesClient (`src/db/entries.go`)

All application data is stored as JSON entries. The four operations map to HTTP verbs:

| Method | HTTP | Description |
|---|---|---|
| `InsertEntry(table, data, dest)` | `POST` | Insert a new entry; decodes response into `dest` |
| `UpdateEntry(table, id, data, dest)` | `PUT` | Update an existing entry by ID |
| `DeleteEntry(table, id, dest)` | `DELETE` | Delete an entry by ID |
| `FindEntry(table, id, dest)` | `GET` | Fetch a single entry by ID |

`dest` is any pointer; the raw JSON response is unmarshalled into it.

---

## Tables used by the application

### `plugins.db`

| Table | Package | Purpose |
|---|---|---|
| `plugins` | `src/plugins/repository` | Installed plugin manifests |

### `poseidon.db`

| Table | Package | Purpose |
|---|---|---|
| `playlists` | `src/playlist` | Playlist metadata (id, name) |
| `playlist_items` | `src/playlist` | Audio items linked to a playlist by `playlist_id` |
| `oauth_clients` | `src/digibox/oauth/repository` | Registered OAuth app credentials |
| `oauth_tokens` | `src/digibox/oauth/repository` | Stored access/refresh tokens |
| `oauth_requests` | `src/digibox/oauth/repository` | In-flight OAuth state parameters |
| `oauth_profiles` | `src/digibox/oauth/repository` | Cloud user profiles associated with tokens |
| `downloads` | `src/digibox/downloads` | Download records (platform, external ID, target folder) |

---

## QueryBuilder (`src/db/querybuilder.go`)

`QueryBuilderFactory.Create(table)` returns a `QueryBuilder` that constructs filter/search payloads for the coco-db query API. Used by repositories that need to filter by field values (e.g. `FindByPlaylistID`, `FindByTokenId`).

---

## Legacy cocodb (`src/cocodb/`)

The `cocodb` package is a legacy file-based JSON registry that predates coco-db. It is no longer used — the `downloadRepository` has been rewritten against SQLite. The package remains in the tree pending full cleanup in Phase 5.
