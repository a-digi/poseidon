package updater

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Source interface {
	Fetch(ctx context.Context) (Manifest, error)
}

type GitHubReleaseSource struct {
	Owner  string
	Repo   string
	Client *http.Client
}

type ghAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
	Digest             string `json:"digest"`
}

type ghRelease struct {
	TagName     string    `json:"tag_name"`
	HTMLURL     string    `json:"html_url"`
	PublishedAt time.Time `json:"published_at"`
	Assets      []ghAsset `json:"assets"`
}

func (g *GitHubReleaseSource) Fetch(ctx context.Context) (Manifest, error) {
	client := g.Client
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", g.Owner, g.Repo)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Manifest{}, fmt.Errorf("github: build request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return Manifest{}, fmt.Errorf("github: request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return Manifest{}, nil
	}
	if resp.StatusCode != http.StatusOK {
		return Manifest{}, fmt.Errorf("github: unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return Manifest{}, fmt.Errorf("github: read body: %w", err)
	}

	var release ghRelease
	if err := json.Unmarshal(body, &release); err != nil {
		return Manifest{}, fmt.Errorf("github: unmarshal: %w", err)
	}

	version := strings.TrimPrefix(release.TagName, "v")

	platforms := make(map[string]PlatformAsset, len(release.Assets))
	for _, a := range release.Assets {
		key := mapAssetToPlatform(a.Name)
		if key == "" {
			continue
		}
		platforms[key] = PlatformAsset{
			URL:    a.BrowserDownloadURL,
			Size:   a.Size,
			SHA256: parseSHA256(a.Digest),
		}
	}

	return Manifest{
		Version:         version,
		ReleaseNotesURL: release.HTMLURL,
		PublishedAt:     release.PublishedAt,
		Platforms:       platforms,
	}, nil
}

func mapAssetToPlatform(name string) string {
	lower := strings.ToLower(name)
	switch {
	case strings.Contains(lower, "darwin") && strings.Contains(lower, "arm64"):
		return "darwin-arm64"
	case strings.Contains(lower, "darwin") && strings.Contains(lower, "amd64"):
		return "darwin-amd64"
	case strings.Contains(lower, "darwin") && strings.Contains(lower, "universal"):
		return "darwin-universal"
	case strings.Contains(lower, "windows") && strings.Contains(lower, "amd64"):
		return "windows-amd64"
	case strings.Contains(lower, "linux") && strings.Contains(lower, "amd64"):
		return "linux-amd64"
	default:
		return ""
	}
}

func parseSHA256(digest string) string {
	if !strings.HasPrefix(digest, "sha256:") {
		return ""
	}
	return strings.TrimPrefix(digest, "sha256:")
}
