package orm

import (
	"database/sql"
	"fmt"
	"regexp"
	"sort"
	"strings"
)

type ColumnType string

const (
	ColumnTypeString  ColumnType = "string"
	ColumnTypeInteger ColumnType = "integer"
	ColumnTypeNumber  ColumnType = "number"
	ColumnTypeBoolean ColumnType = "boolean"
)

var allowedTypes = map[ColumnType]bool{
	ColumnTypeString:  true,
	ColumnTypeInteger: true,
	ColumnTypeNumber:  true,
	ColumnTypeBoolean: true,
}

// sqlType maps a JSON-Schema-style type to a SQLite column type.
func (t ColumnType) sqlType() string {
	switch t {
	case ColumnTypeString:
		return "TEXT"
	case ColumnTypeInteger:
		return "INTEGER"
	case ColumnTypeNumber:
		return "REAL"
	case ColumnTypeBoolean:
		return "BOOLEAN" // stored as INTEGER 0/1; declared as BOOLEAN for metadata lookup
	default:
		return "TEXT"
	}
}

// nullableDefault returns a safe NOT NULL DEFAULT clause for each type.
func (t ColumnType) nullableDefault() string {
	switch t {
	case ColumnTypeString:
		return " NOT NULL DEFAULT ''"
	case ColumnTypeBoolean:
		return " NOT NULL DEFAULT 0"
	default:
		return " NOT NULL DEFAULT 0"
	}
}

var validName = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

var reservedColumns = map[string]bool{
	"id": true, "created_at": true, "updated_at": true,
}

type PropertySchema struct {
	Type     ColumnType `json:"type"`
	Nullable bool       `json:"nullable"`
	Unique   bool       `json:"unique,omitempty"`
}

type TableSchema struct {
	Name       string                    `json:"name"`
	Properties map[string]PropertySchema `json:"properties"`
}

func (s TableSchema) Validate() error {
	if !validName.MatchString(s.Name) {
		return fmt.Errorf("invalid table name %q", s.Name)
	}
	if strings.HasPrefix(strings.ToLower(s.Name), "sqlite_") {
		return fmt.Errorf("table name %q is reserved", s.Name)
	}
	if len(s.Properties) == 0 {
		return fmt.Errorf("table must have at least one property")
	}
	for name, prop := range s.Properties {
		if !validName.MatchString(name) {
			return fmt.Errorf("invalid property name %q", name)
		}
		if reservedColumns[name] {
			return fmt.Errorf("property name %q is reserved", name)
		}
		if !allowedTypes[prop.Type] {
			return fmt.Errorf("unknown type %q for property %q — allowed: string, integer, number, boolean", prop.Type, name)
		}
	}
	return nil
}

// CreateSQL generates a CREATE TABLE IF NOT EXISTS statement.
// Auto-managed columns (id, created_at, updated_at) are always prepended.
// Plugin-defined columns are sorted alphabetically for determinism.
func (s TableSchema) CreateSQL() string {
	var b strings.Builder
	b.WriteString("CREATE TABLE IF NOT EXISTS ")
	b.WriteString(s.Name)
	b.WriteString(" (\n  id TEXT PRIMARY KEY,\n  created_at INTEGER NOT NULL DEFAULT 0,\n  updated_at INTEGER NOT NULL DEFAULT 0")
	for _, name := range sortedPropertyKeys(s.Properties) {
		prop := s.Properties[name]
		b.WriteString(",\n  ")
		b.WriteString(name)
		b.WriteString(" ")
		b.WriteString(prop.Type.sqlType())
		if !prop.Nullable {
			b.WriteString(prop.Type.nullableDefault())
		}
		if prop.Unique {
			b.WriteString(" UNIQUE")
		}
	}
	b.WriteString("\n)")
	return b.String()
}

// createMetaTable creates the internal column-type registry table.
func createMetaTable(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS _orm_columns (
		table_name  TEXT NOT NULL,
		column_name TEXT NOT NULL,
		column_type TEXT NOT NULL,
		PRIMARY KEY (table_name, column_name)
	)`)
	return err
}

// storeSchema persists column type metadata so CRUD can reconstruct types
// when serialising records back to JSON (e.g. boolean ↔ 0/1 conversion).
func storeSchema(db *sql.DB, schema TableSchema) error {
	for name, prop := range schema.Properties {
		_, err := db.Exec(
			`INSERT OR REPLACE INTO _orm_columns (table_name, column_name, column_type) VALUES (?, ?, ?)`,
			schema.Name, name, string(prop.Type),
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// loadColumnTypes returns a column-name → ColumnType map for a given table.
func loadColumnTypes(db *sql.DB, table string) (map[string]ColumnType, error) {
	rows, err := db.Query(
		`SELECT column_name, column_type FROM _orm_columns WHERE table_name = ?`, table,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make(map[string]ColumnType)
	for rows.Next() {
		var name, typ string
		if err := rows.Scan(&name, &typ); err != nil {
			return nil, err
		}
		result[name] = ColumnType(typ)
	}
	return result, rows.Err()
}

func sortedPropertyKeys(m map[string]PropertySchema) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
