package system

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type systemData struct {
	InstalledAt    int64         `json:"installedAt"`
	LastOpenedAt   int64         `json:"lastOpenedAt"`
	LaunchCount    int           `json:"launchCount"`
	VersionHistory []storedEntry `json:"versionHistory"`
}

type storedEntry struct {
	Version     string `json:"version"`
	FirstSeenAt int64  `json:"firstSeenAt"`
}

type Store struct{ path string }

func NewStore(dataDir string) *Store {
	return &Store{path: filepath.Join(dataDir, "system.json")}
}

func (s *Store) RecordLaunch(version string) error {
	d, _ := s.Read()
	now := time.Now().UTC().Unix()
	if d.InstalledAt == 0 {
		d.InstalledAt = now
	}
	d.LastOpenedAt = now
	d.LaunchCount++
	if version != "" && !hasVersion(d.VersionHistory, version) {
		d.VersionHistory = append([]storedEntry{{version, now}}, d.VersionHistory...)
	}
	return s.write(d)
}

func (s *Store) Read() (systemData, error) {
	b, err := os.ReadFile(s.path)
	if os.IsNotExist(err) {
		return systemData{}, nil
	}
	if err != nil {
		return systemData{}, err
	}
	var d systemData
	return d, json.Unmarshal(b, &d)
}

func (s *Store) write(d systemData) error {
	b, _ := json.MarshalIndent(d, "", "  ")
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, b, 0644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func hasVersion(history []storedEntry, v string) bool {
	for _, e := range history {
		if e.Version == v {
			return true
		}
	}
	return false
}
