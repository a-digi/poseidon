package orm

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

func Insert(db *sql.DB, table string, data map[string]interface{}) (map[string]interface{}, error) {
	if err := validateName(table); err != nil {
		return nil, err
	}
	types, _ := loadColumnTypes(db, table)

	cols := []string{"id", "created_at", "updated_at"}
	args := []interface{}{uuid.NewString(), time.Now().Unix(), int64(0)}

	for k, v := range data {
		if reservedColumns[k] {
			continue
		}
		if err := validateName(k); err != nil {
			return nil, err
		}
		cols = append(cols, k)
		args = append(args, toSQL(v, types[k]))
	}

	placeholders := make([]string, len(cols))
	for i := range placeholders {
		placeholders[i] = "?"
	}
	_, err := db.Exec(
		fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", table, strings.Join(cols, ", "), strings.Join(placeholders, ", ")),
		args...,
	)
	if err != nil {
		return nil, err
	}
	return FindOne(db, table, args[0].(string))
}

func FindAll(db *sql.DB, table string, filter QueryFilter) ([]map[string]interface{}, error) {
	if err := validateName(table); err != nil {
		return nil, err
	}
	where, whereArgs := filter.whereClause()
	query := fmt.Sprintf("SELECT * FROM %s %s %s LIMIT ? OFFSET ?",
		table, where, filter.orderClause())
	args := append(whereArgs, filter.effectiveLimit(), filter.Offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	types, _ := loadColumnTypes(db, table)
	return scanRows(rows, types)
}

func FindOne(db *sql.DB, table string, id string) (map[string]interface{}, error) {
	if err := validateName(table); err != nil {
		return nil, err
	}
	rows, err := db.Query(fmt.Sprintf("SELECT * FROM %s WHERE id = ?", table), id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	types, _ := loadColumnTypes(db, table)
	results, err := scanRows(rows, types)
	if err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, fmt.Errorf("record not found")
	}
	return results[0], nil
}

func Update(db *sql.DB, table string, id string, data map[string]interface{}) (map[string]interface{}, error) {
	if err := validateName(table); err != nil {
		return nil, err
	}
	types, _ := loadColumnTypes(db, table)

	var setClauses []string
	var args []interface{}
	for k, v := range data {
		if reservedColumns[k] {
			continue
		}
		if err := validateName(k); err != nil {
			return nil, err
		}
		setClauses = append(setClauses, k+" = ?")
		args = append(args, toSQL(v, types[k]))
	}
	if len(setClauses) == 0 {
		return FindOne(db, table, id)
	}
	setClauses = append(setClauses, "updated_at = ?")
	args = append(args, time.Now().Unix(), id)

	_, err := db.Exec(
		fmt.Sprintf("UPDATE %s SET %s WHERE id = ?", table, strings.Join(setClauses, ", ")),
		args...,
	)
	if err != nil {
		return nil, err
	}
	return FindOne(db, table, id)
}

func Delete(db *sql.DB, table string, id string) error {
	if err := validateName(table); err != nil {
		return err
	}
	res, err := db.Exec(fmt.Sprintf("DELETE FROM %s WHERE id = ?", table), id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("record not found")
	}
	return nil
}

func ListTables(db *sql.DB) ([]string, error) {
	rows, err := db.Query(
		`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_orm_columns' ORDER BY name`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		tables = append(tables, name)
	}
	return tables, rows.Err()
}

func DropTable(db *sql.DB, table string) error {
	if err := validateName(table); err != nil {
		return err
	}
	if _, err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", table)); err != nil {
		return err
	}
	_, err := db.Exec(`DELETE FROM _orm_columns WHERE table_name = ?`, table)
	return err
}

// validateName checks that a table or column name is a safe SQL identifier.
func validateName(name string) error {
	if !validName.MatchString(name) {
		return fmt.Errorf("invalid name %q", name)
	}
	if strings.HasPrefix(strings.ToLower(name), "sqlite_") {
		return fmt.Errorf("name %q is reserved", name)
	}
	return nil
}

// toSQL converts a JSON-decoded value to its SQLite-compatible form.
// JSON numbers decode as float64; booleans need to become 0/1.
func toSQL(v interface{}, colType ColumnType) interface{} {
	switch colType {
	case ColumnTypeBoolean:
		switch b := v.(type) {
		case bool:
			if b {
				return int64(1)
			}
			return int64(0)
		case float64:
			if b != 0 {
				return int64(1)
			}
			return int64(0)
		}
	case ColumnTypeInteger:
		if f, ok := v.(float64); ok {
			return int64(f)
		}
	}
	return v
}

// fromSQL converts a SQLite value back to its JSON-friendly form.
// BOOLEAN columns are stored as INTEGER 0/1 and must come back as bool.
func fromSQL(v interface{}, colType ColumnType) interface{} {
	if colType == ColumnTypeBoolean {
		switch n := v.(type) {
		case int64:
			return n != 0
		case float64:
			return n != 0
		}
	}
	return v
}

func scanRows(rows *sql.Rows, types map[string]ColumnType) ([]map[string]interface{}, error) {
	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	var results []map[string]interface{}
	for rows.Next() {
		vals := make([]interface{}, len(cols))
		ptrs := make([]interface{}, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		row := make(map[string]interface{}, len(cols))
		for i, col := range cols {
			row[col] = fromSQL(vals[i], types[col])
		}
		results = append(results, row)
	}
	return results, rows.Err()
}
