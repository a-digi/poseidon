package orm

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"t-digi-posseidon/src/db/sqlite"
)

type PluginDBManager struct {
	userDataDir string
	mu          sync.Mutex
	dbs         map[string]*sql.DB
}

func NewPluginDBManager(userDataDir string) *PluginDBManager {
	return &PluginDBManager{
		userDataDir: userDataDir,
		dbs:         make(map[string]*sql.DB),
	}
}

func (m *PluginDBManager) Open(pluginID string) (*sql.DB, error) {
	if err := validateName(pluginID); err != nil {
		return nil, fmt.Errorf("invalid plugin id: %w", err)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if db, ok := m.dbs[pluginID]; ok {
		return db, nil
	}
	dir := filepath.Join(m.userDataDir, "plugin-data", pluginID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("plugin db dir: %w", err)
	}
	db, err := sqlite.Open(dir, pluginID+".db")
	if err != nil {
		return nil, err
	}
	if err := createMetaTable(db); err != nil {
		db.Close()
		return nil, err
	}
	m.dbs[pluginID] = db
	return db, nil
}

func (m *PluginDBManager) Close(pluginID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	db, ok := m.dbs[pluginID]
	if !ok {
		return nil
	}
	delete(m.dbs, pluginID)
	return db.Close()
}

func (m *PluginDBManager) CloseAll() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	var last error
	for id, db := range m.dbs {
		if err := db.Close(); err != nil {
			last = err
		}
		delete(m.dbs, id)
	}
	return last
}
