package storage

import (
	"os"
	"path/filepath"
	"runtime"
)

// CreateAppDataDir erkennt das Betriebssystem und erstellt das App-Datenverzeichnis.
// Gibt den Pfad zurück oder einen Fehler.
func CreateAppDataDir(appName string) (string, error) {
	var baseDir string
	var err error

	switch runtime.GOOS {
	case "darwin": // macOS
		baseDir, err = os.UserConfigDir()
		if err != nil {
			return "", err
		}
		// macOS: ~/Library/Application Support/<AppName>
		baseDir = filepath.Join(filepath.Dir(baseDir), "Application Support")
	case "linux":
		baseDir, err = os.UserConfigDir()
		if err != nil {
			return "", err
		}
		// Linux: ~/.config/<AppName>
		// baseDir bleibt wie geliefert
	case "windows":
		baseDir, err = os.UserConfigDir()
		if err != nil {
			return "", err
		}
		// Windows: %APPDATA%\<AppName>
		// baseDir bleibt wie geliefert
	default:
		baseDir, err = os.UserHomeDir()
		if err != nil {
			return "", err
		}
		baseDir = filepath.Join(baseDir, ".config")
	}

	appDataPath := filepath.Join(baseDir, appName)
	if err := os.MkdirAll(appDataPath, 0755); err != nil {
		return "", err
	}

	return appDataPath, nil
}

