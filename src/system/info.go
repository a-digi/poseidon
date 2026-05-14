package system

import (
	"runtime"
	"time"
)

type BuildVars struct {
	Version   string
	Commit    string
	BuildDate string
}

type SystemInfo struct {
	Version        string         `json:"version"`
	Commit         string         `json:"commit"`
	BuildDate      string         `json:"buildDate"`
	InstalledAt    string         `json:"installedAt"`
	LastOpenedAt   string         `json:"lastOpenedAt"`
	LaunchCount    int            `json:"launchCount"`
	DataDir        string         `json:"dataDir"`
	OS             string         `json:"os"`
	Arch           string         `json:"arch"`
	VersionHistory []VersionEntry `json:"versionHistory"`
}

type VersionEntry struct {
	Version     string `json:"version"`
	FirstSeenAt string `json:"firstSeenAt"`
}

func BuildInfo(bv BuildVars, dataDir string, d systemData) SystemInfo {
	history := make([]VersionEntry, len(d.VersionHistory))
	for i, e := range d.VersionHistory {
		history[i] = VersionEntry{e.Version, toISO(e.FirstSeenAt)}
	}
	return SystemInfo{
		Version:        bv.Version,
		Commit:         bv.Commit,
		BuildDate:      bv.BuildDate,
		InstalledAt:    toISO(d.InstalledAt),
		LastOpenedAt:   toISO(d.LastOpenedAt),
		LaunchCount:    d.LaunchCount,
		DataDir:        dataDir,
		OS:             runtime.GOOS,
		Arch:           runtime.GOARCH,
		VersionHistory: history,
	}
}

func toISO(unix int64) string {
	if unix == 0 {
		return ""
	}
	return time.Unix(unix, 0).UTC().Format(time.RFC3339)
}
