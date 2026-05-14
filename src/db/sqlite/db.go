package sqlite

import (
	"database/sql"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

func Open(dataDir, filename string) (*sql.DB, error) {
	path := filepath.Join(dataDir, filename)
	return sql.Open("sqlite3", path)
}
