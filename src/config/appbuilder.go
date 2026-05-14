package config

import (
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

// AppBuilder enthält Hilfsfunktionen für App-spezifische Verzeichnisse und Konfigurationen
// (z.B. Plugin-Verzeichnis, Datenverzeichnis, später erweiterbar)
type AppBuilder struct{}

// NewAppBuilder erstellt eine neue Instanz von AppBuilder
func NewAppBuilder() *AppBuilder {
	return &AppBuilder{}
}

// BuildPluginBasePath bestimmt das Plugin-Basisverzeichnis anhand der Argumente und des Modus
func (b *AppBuilder) BuildPluginBasePath(args map[string]string, isDev bool, userDataDir string) string {
	customPluginDir := args["plugin-dir"]
	if customPluginDir != "" {
		return customPluginDir
	}

	if isDev {
		cwd, err := os.Getwd()
		if err != nil {
			return filepath.Join(userDataDir, "plugins")
		}
		return filepath.Join(cwd, "plugins")
	}
	return filepath.Join(userDataDir, "plugins")
}

// BuildUserDataDir bestimmt das Datenverzeichnis anhand der Argumente
func (b *AppBuilder) BuildUserDataDir(args map[string]string, isDev bool, defaultDataDir string) string {
	customDataDir := args["data-dir"]
	if customDataDir != "" {
		return customDataDir
	}
	return defaultDataDir
}

// BuildLocalDevSourceDir resolves the source folder for the synthetic
// "Local Dev" marketplace repository. This is independent of the runtime
// pluginBasePath because in dev workflows --plugin-dir is typically pointed
// at a runtime install target (e.g. workspace/plugins) while the actual
// in-development plugin sources live in <repo>/plugins/.
//
// Returns "" outside of dev mode (signal: do not emit the synthetic repo).
func (b *AppBuilder) BuildLocalDevSourceDir(args map[string]string, isDev bool) string {
	if !isDev {
		return ""
	}
	if custom := args["local-dev-dir"]; custom != "" {
		return custom
	}
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}
	return filepath.Join(cwd, "plugins")
}

func (b *AppBuilder) StartDatabaseBinary(binaryPath string, args []string, envVars []string, workingDir string) (*exec.Cmd, error) {

	fileInfo, err := os.Stat(binaryPath)
	if err != nil {
		return nil, err
	}

	if fileInfo.Mode().Perm()&0100 == 0 {
		return nil, os.ErrPermission
	}

	cmd := exec.Command(binaryPath, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if envVars != nil {
		cmd.Env = append(os.Environ(), envVars...)
	}
	if workingDir != "" {
		cmd.Dir = workingDir
	}
	if err := cmd.Start(); err != nil {
		log.Printf("[ERROR] Datenbank-Binary konnte nicht gestartet werden: %v", err)
		if os.IsPermission(err) {
			log.Printf("[ERROR] Keine Ausführungsrechte für: %s", binaryPath)
		}
		return nil, err
	}
	log.Printf("[INFO] Datenbank-Binary gestartet (PID: %d): %s", cmd.Process.Pid, binaryPath)

	go func() {
		err := cmd.Wait()
		if err != nil {
			log.Printf("[ERROR] Datenbank-Binary wurde unerwartet beendet: %v", err)
			if exitErr, ok := err.(*exec.ExitError); ok {
				log.Printf("[ERROR] Exit-Status: %v", exitErr.ExitCode())
			}
		}
	}()

	return cmd, nil
}

func (b *AppBuilder) CopyAndPrepareDatabaseBinary(srcPath, dstDir, binaryName string) (string, error) {
	dstPath := filepath.Join(dstDir, binaryName)
	if err := os.MkdirAll(dstDir, 0755); err != nil {
		return "", err
	}

	if info, err := os.Stat(dstPath); err == nil && info.Mode().Perm()&0100 != 0 {
		return dstPath, nil
	}

	srcFile, err := os.Open(srcPath)
	if err != nil {
		return "", err
	}

	defer srcFile.Close()

	dstFile, err := os.Create(dstPath)

	if err != nil {
		return "", err
	}
	defer dstFile.Close()
	if _, err := io.Copy(dstFile, srcFile); err != nil {
		return "", err
	}
	if err := dstFile.Chmod(0755); err != nil {
		return "", err
	}

	return dstPath, nil
}
