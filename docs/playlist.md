# Playlist

## Data Models

```go
// A playlist container
type Playlist struct {
    ID    string        `json:"id"`
    Items []DigitalItem `json:"items"`
}

// Index entry (used when listing all playlists)
type PlaylistIndex struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

// A single audio track inside a playlist
type DigitalItem struct {
    ID         string `json:"id"`
    Title      string `json:"title"`
    URL        string `json:"url"`         // absolute path to the local file
    PlaylistId string `json:"playlistId"`
    Artist     string `json:"artist"`
    Album      string `json:"album"`
    Genre      string `json:"genre"`
    Year       int    `json:"year"`
    Track      int    `json:"track"`
    Length     int    `json:"length"`      // duration in seconds
    Picture    string `json:"picture"`     // base64-encoded cover art
    MimeType   string `json:"mimeType"`
}
```

---

## PlaylistService (`src/playlist/playlist.go`)

`PlaylistService` is the single point of access for all playlist operations. It owns a mutex so concurrent Wails calls are safe.

```go
type PlaylistService struct {
    mu                    sync.Mutex
    folderPath            string
    repository            *PlaylistRepository
    digitalItemRepository *DigitalItemRepository
    DBManager             *db.DBManager
}
```

Constructed in `app.go:Startup`:

```go
playlist.NewPlaylistService(userDataDir, dbManager)
```

### Operations

| Method | Behavior |
|---|---|
| `Create(name)` | Inserts a row in the `playlist` table. Returns `PlaylistIndex`. |
| `Edit(id, name)` | Updates the `name` field of a playlist row. |
| `Delete(id)` | Deletes the playlist row. Items are not cascade-deleted automatically. |
| `AddItem(playlistID, item)` | Extracts metadata from `item.URL` via `digitalitem.ExtractMetadata`, then inserts a row in `playlist_item`. |
| `GetByID(id)` | Fetches all `playlist_item` rows where `playlistId == id`. Returns a `Playlist` with items. |
| `ListPlaylists()` | Returns all `PlaylistIndex` rows. Returns empty array on error (never an error response). |
| `DeleteItem(playlistID, itemID)` | Deletes a single `playlist_item` row by `itemID`. |

---

## Repositories

### PlaylistRepository (`src/playlist/repository.go`)

- Table: `playlist`
- `FindAll()` — returns `[]PlaylistIndex`
- Uses `DBManager.Search` or `DBManager.Entries` for queries

### DigitalItemRepository (`src/playlist/repository_digital_item.go` — inferred from usage)

- Table: `playlist_item`
- `FindByPlaylistID(id)` — returns `[]DigitalItem` filtered by `playlistId`

---

## Metadata Extraction

When `AddItem` is called with a `URL` (local file path), it calls:

```go
digitalitem.ExtractMetadata(filePath)
```

This reads audio tags with `github.com/dhowden/tag` and returns:

```go
type Metadata struct {
    Title, Artist, Album, Genre string
    Year, Track, Length         int
    Picture                     string   // base64-encoded cover art
    MimeType                    string
}
```

If extraction fails (e.g. unsupported format), the item is still saved with whatever fields the frontend provided.
