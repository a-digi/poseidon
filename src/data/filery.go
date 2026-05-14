package data

import (
	"fmt"
	"os"
	"path/filepath"
)

func CreateRequiredFile(folderPath string, name string, content string) error {
	filePath := filepath.Join(folderPath, name)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		f, err := os.Create(filePath)
		if err != nil {
			return fmt.Errorf("Fehler beim Erstellen der Datei %s: %w", filePath, err)
		}
		defer f.Close()
		if _, err := f.WriteString(content); err != nil {
			return fmt.Errorf("Fehler beim Schreiben in die Datei %s: %w", filePath, err)
		}
	}
	return nil
}
