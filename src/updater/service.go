package updater

import (
	"context"
	"runtime"
	"sync"
	"time"

	"t-digi-posseidon/src/plugins/marketplace"
)

type Service struct {
	current string
	src     Source
	mu      sync.Mutex
	last    UpdateState
	checked bool
}

func New(currentVersion string, src Source) *Service {
	return &Service{current: currentVersion, src: src}
}

func (s *Service) Current() string { return s.current }

func (s *Service) Last() UpdateState {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.last
}

func (s *Service) Check(ctx context.Context) UpdateState {
	if s.current == "" || s.current == "dev" {
		state := UpdateState{
			CurrentVersion:  s.current,
			UpdateAvailable: false,
			Error:           "development build",
			CheckedAt:       time.Now(),
		}
		s.mu.Lock()
		s.last = state
		s.checked = true
		s.mu.Unlock()
		return state
	}

	manifest, err := s.src.Fetch(ctx)
	if err != nil {
		state := UpdateState{
			CurrentVersion:  s.current,
			UpdateAvailable: false,
			Error:           err.Error(),
			CheckedAt:       time.Now(),
		}
		s.mu.Lock()
		s.last = state
		s.checked = true
		s.mu.Unlock()
		return state
	}

	if manifest.Version == "" {
		state := UpdateState{
			CurrentVersion: s.current,
			CheckedAt:      time.Now(),
		}
		s.mu.Lock()
		s.last = state
		s.checked = true
		s.mu.Unlock()
		return state
	}

	updateAvailable := marketplace.CompareSemver(manifest.Version, s.current) > 0

	var asset *PlatformAsset
	if a, ok := manifest.Platforms[HostPlatformKey()]; ok {
		asset = &a
	} else if runtime.GOOS == "darwin" {
		if a, ok := manifest.Platforms["darwin-universal"]; ok {
			asset = &a
		}
	}

	state := UpdateState{
		CurrentVersion:  s.current,
		LatestVersion:   manifest.Version,
		UpdateAvailable: updateAvailable,
		Asset:           asset,
		ReleaseNotesURL: manifest.ReleaseNotesURL,
		CheckedAt:       time.Now(),
	}

	s.mu.Lock()
	s.last = state
	s.checked = true
	s.mu.Unlock()

	return state
}
