# Backend

The backend is written in Go and compiled into the Wails app bundle. All public methods on the `App` struct in `app.go` are automatically exposed to the frontend via Wails IPC.

---

## App Lifecycle

Wails calls four lifecycle hooks in order:

| Hook | Location | What it does |
|---|---|---|
| `Startup(ctx)` | `app.go:69` | Creates user-data dir, starts coco-db, initialises all repositories, starts OAuth callback server |
| `DomReady(ctx)` | `app.go:302` | Starts OAuth status endpoint, begins forwarding OAuth events to the frontend |
| `BeforeClose(ctx)` | `app.go:311` | Returns `false` (close is allowed) |
| `Shutdown(ctx)` | `app.go:315` | Shuts down coco-db process and the HTTP callback server |

---

## App Struct

```go
type App struct {
    ctx                    context.Context
    playlistService        *playlist.PlaylistService
    oauthStore             *oauth.ClientStore
    oauthClientRepository  *repository.OauthClientsRepository
    oauthTokenRepository   *repository.OauthTokenRepository
    oauthRequestRepository *repository.OauthRequestRepository
    oauthProfileRepository *repository.OauthProfileRepository
    downloadRepository     *downloadRepository.DownloadsRepository
    eventBus               *events.EventBus
    oauthCodeChan          chan map[string]interface{}
    userDataDir            string
    StartURL               string
    backendServer          *http.Server
    pluginBasePath         string
    dbProcess              *exec.Cmd
    dbManager              *db.DBManager
}
```

`NewApp(startURL?)` constructs a zero-value `App`; everything else is wired in `Startup`.

---

## Source Packages

### `src/config`

**`AppBuilder`** (`appbuilder.go`) resolves two runtime paths:

- `BuildUserDataDir(flags, isDev, defaultDir)` → `~/Library/Application Support/poseidon` in production, or a dev override.
- `BuildPluginBasePath(flags, isDev, userDataDir)` → `<userDataDir>/plugins` or `--plugin-dir` flag in dev mode.

**`ParseAllowedCommands`** (`commands.go`) parses `--key=value` CLI flags into a `map[string]string`.

---

### `src/data`

`Startup(userDataDir)` ensures the user-data directory hierarchy exists. `filery.go` provides filesystem helpers used during initialisation.

---

### `src/playlist`

See [playlist.md](playlist.md).

---

### `src/db`

See [database.md](database.md).

---

### `src/digibox`

See [oauth.md](oauth.md).

---

### `src/plugins`

See [plugins.md](plugins.md).

---

### `src/digitalitem`

`ExtractMetadata(filePath string) (*Metadata, error)` opens a local audio file and reads tags using `github.com/dhowden/tag`. It returns title, artist, album, genre, year, track number, duration, cover art (base64), and MIME type.

`GetAudioDataURL(path string) (string, error)` reads a file and encodes it as a `data:audio/...;base64,…` URL for playback in the Webview.

---

### `src/response`

Two helpers used by every public method:

```go
response.SuccessResponse(data interface{}) string
response.ErrorResponse(message string) string
```

Both return a JSON string `{"status":"success"|"error","message":…}`.

---

### `src/primitive`

Utility functions for string formatting and number conversion. No domain logic.

---

## Wails-Bound Methods (public API surface)

All methods on `*App` are callable from the frontend via the auto-generated `wailsjs/go/main/App.js` bindings.

### Playlist

| Method | Description |
|---|---|
| `ListPlaylists()` | Returns all playlists (id + name) |
| `CreatePlaylist(name)` | Creates a new playlist |
| `EditPlaylist(id, name)` | Renames a playlist |
| `DeletePlaylist(id)` | Deletes a playlist |
| `GetPlaylistByID(id)` | Returns playlist with all its items |
| `AddPlaylistItem(playlistID, item)` | Adds an audio item; auto-extracts metadata |
| `DeletePlaylistItem(playlistID, itemID)` | Removes an item from a playlist |

### File System

| Method | Description |
|---|---|
| `OpenFileDialog()` | Native file picker filtered to audio formats |
| `OpenDirectoryDialog()` | Native folder picker |
| `GetAudioDataUrl(path)` | Returns a base64 data-URL for an audio file |

### OAuth & Cloud

| Method | Description |
|---|---|
| `ListOAuthClients()` | Lists registered OAuth clients |
| `AddOAuthClient(clientJson)` | Registers a new OAuth client |
| `DeleteOAuthClient(id)` | Removes an OAuth client |
| `GetActiveProviders()` | Returns providers that have a registered client |
| `CreateAuthorizationLink(clientID, state)` | Generates a Dropbox OAuth authorization URL |
| `AddOAuthRequest(request)` | Persists an OAuth request before redirect |
| `AuthorizeWithCode(state, code)` | Exchanges auth code for access token |
| `GetSuccessfulAuthorizations()` | Returns all stored tokens with profile info |
| `GetProfileByTokenID(tokenID)` | Returns the cloud profile linked to a token |
| `DeleteAuthorization(authorizationID)` | Revokes and deletes a stored token |
| `ListDropboxFiles(tokenId, path)` | Lists Dropbox files; annotates with local download status |
| `DownloadDropboxFile(tokenId, path, targetPath, customId)` | Downloads a file; emits `dropbox:download:progress` events |

### Misc

| Method | Description |
|---|---|
| `GetStartURL()` | Returns the deep-link URL the app was opened with |

---

## Runtime Events emitted to the frontend

| Event name | Payload | Trigger |
|---|---|---|
| `oauth:status` | `"success"` | OAuth code successfully exchanged |
| `dropbox:download:progress` | JSON progress object | Each chunk of a Dropbox download |
