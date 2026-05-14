package updater

import (
	"runtime"
	"time"
)

type PlatformAsset struct {
	URL    string `json:"url"`
	Size   int64  `json:"size"`
	SHA256 string `json:"sha256"`
}

type Manifest struct {
	Version         string                   `json:"version"`
	ReleaseNotesURL string                   `json:"releaseNotesUrl"`
	PublishedAt     time.Time                `json:"publishedAt"`
	Platforms       map[string]PlatformAsset `json:"platforms"`
}

type UpdateState struct {
	CurrentVersion  string         `json:"currentVersion"`
	LatestVersion   string         `json:"latestVersion"`
	UpdateAvailable bool           `json:"updateAvailable"`
	Asset           *PlatformAsset `json:"asset,omitempty"`
	ReleaseNotesURL string         `json:"releaseNotesUrl,omitempty"`
	CheckedAt       time.Time      `json:"checkedAt"`
	Error           string         `json:"error,omitempty"`
}

// HostPlatformKey returns the platform key for the current OS+arch,
// e.g. "darwin-arm64", "darwin-amd64", "windows-amd64", "linux-amd64".
func HostPlatformKey() string {
	return runtime.GOOS + "-" + runtime.GOARCH
}
