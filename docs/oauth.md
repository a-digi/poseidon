# OAuth & Cloud Integration

## Overview

The `src/digibox/` package handles everything related to cloud storage: OAuth authentication, provider-specific API clients, file downloads, and an internal EventBus for decoupling the OAuth callback flow.

Currently **Dropbox** is fully implemented. A `googledrive_handler.go` exists as a stub for future Google Drive support.

---

## OAuth Flow

```
1. User registers an OAuth client (client ID + secret) via the UI
        ↓ AddOAuthClient()
        → stored in oauth_client table

2. User initiates authorization
        ↓ CreateAuthorizationLink(clientID, state)
        → generates Dropbox authorization URL
        → App saves an OauthRequest (state, clientID, timestamp)
        → URL opened in the system browser

3. User approves on Dropbox
        ↓ Dropbox redirects to localhost:2014/oauth/callback?code=…&state=…
        → OAuth Callback Server (port 2014) receives the request
        → EventBus.Publish("oauth:code", OauthCode{code, state})

4. EventBus handler in app.go fires
        ↓ AuthorizeWithCode(state, code)
        → Looks up the OauthRequest by state
        → Exchanges code for access token via Dropbox API
        → Stores token in oauth_token table
        → Fetches and stores Dropbox profile in oauth_profile table
        → runtime.EventsEmit(ctx, "oauth:status", "success")
```

---

## EventBus (`src/digibox/events/eventbus.go`)

A simple in-process pub/sub bus:

```go
eb := events.NewEventBus()
eb.Subscribe("oauth:code", func(data interface{}) { … })
eb.Publish("oauth:code", OauthCode{…})   // fires handlers in goroutines
```

All handlers are invoked concurrently via `go handler(data)`.

---

## OAuth Callback Server (`src/plugins/server/server.go`)

An `net/http` server started on port **2014** in `app.go:Startup`. It serves two purposes:

1. **`/oauth/callback`** — receives the OAuth redirect, extracts `code` and `state`, publishes to the EventBus.
2. **Plugin static assets** — serves frontend plugin bundles from `<pluginBasePath>/<pluginID>/ui/`.

---

## Repositories (`src/digibox/oauth/repository/`)

All repositories take a `*db.DBManager` and use `EntriesClient` + `QueryBuilder` internally.

| Repository | Table | Key operations |
|---|---|---|
| `OauthClientsRepository` | `oauth_client` | Insert, FindAll, FindByClientId, Delete |
| `OauthTokenRepository` | `oauth_token` | Insert, FindAll, FindByID, FindByClientId, DeleteByID |
| `OauthRequestRepository` | `oauth_request` | Insert, FindById, FindByState |
| `OauthProfileRepository` | `oauth_profile` | Insert, FindByTokenId |

---

## Data Models (`src/digibox/oauth/model/model.go`)

```go
type OauthClient struct {
    ID       string
    ClientId string
    Secret   string
    Provider string   // "dropbox" | "googledrive"
}

type OauthToken struct {
    ID          string
    ClientId    string
    AccessToken string
    Provider    string
    RequestID   string
}

type OauthRequest struct {
    ID          string
    State       string
    ClientId    string
    RequestedOn int64   // Unix timestamp
}

type OauthProfile struct {
    ID          string
    TokenId     string
    DisplayName string
    Email       string
    AccountId   string
}

// View model returned by GetSuccessfulAuthorizations
type OauthRequestView struct {
    ID           string
    RequestedOn  int64
    OauthToken   OauthToken
    OauthProfile *OauthProfile
}
```

---

## Dropbox API (`src/digibox/dropbox/`)

### Listing files

```go
dropbox.ListDropboxFiles(token, tokenRepository, clientSecret, path)
```

- Calls the Dropbox `/files/list_folder` endpoint.
- Auto-refreshes the access token if expired (using the client secret).
- Returns a `DropResult{Entries []DropboxEntry, Provider string}`.
- Each `DropboxEntry` is annotated with `Downloaded: bool` by cross-checking the local `DownloadsRepository`.

### Downloading files

```go
progressChan, err := dropbox.DownloadDropboxFileWithProgress(accessToken, pathOrId, targetPath, customId)
```

- Starts a chunked HTTP download from Dropbox in a goroutine.
- Sends progress structs on `progressChan` as each chunk completes.
- The caller (`app.go:DownloadDropboxFile`) forwards these as `dropbox:download:progress` Wails events to the frontend.
- On success, a record is inserted into `DownloadsRepository` (legacy cocodb-based) so `ListDropboxFiles` can mark the file as downloaded.

### Token refresh

`src/digibox/dropbox/dropbox.go` contains the refresh logic. `oauth.InitProviderChain` wires it into the token repository so that any call that receives a 401 automatically refreshes and retries.

---

## Downloads Repository (`src/digibox/downloads/`)

Backed by the legacy `cocodb` file registry (not coco-db). Stores `{platform, externalId, targetFolder}` records so the UI can show whether a cloud file has already been downloaded and where it lives on disk.

If the target folder no longer exists when `ListDropboxFiles` runs, the stale download record is deleted asynchronously.
