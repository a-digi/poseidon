package orm

import (
	"fmt"
	"strings"
)

type QueryFilter struct {
	Where   map[string]interface{} `json:"where,omitempty"`
	Limit   int                    `json:"limit,omitempty"`
	Offset  int                    `json:"offset,omitempty"`
	OrderBy string                 `json:"order_by,omitempty"`
	Order   string                 `json:"order,omitempty"` // "asc" | "desc"
}

func (f QueryFilter) whereClause() (string, []interface{}) {
	if len(f.Where) == 0 {
		return "", nil
	}
	var clauses []string
	var args []interface{}
	for col, val := range f.Where {
		if !validName.MatchString(col) {
			continue
		}
		clauses = append(clauses, fmt.Sprintf("%s = ?", col))
		args = append(args, val)
	}
	if len(clauses) == 0 {
		return "", nil
	}
	return "WHERE " + strings.Join(clauses, " AND "), args
}

func (f QueryFilter) orderClause() string {
	col := f.OrderBy
	if col == "" || !validName.MatchString(col) {
		col = "created_at"
	}
	dir := "ASC"
	if strings.ToLower(f.Order) == "desc" {
		dir = "DESC"
	}
	return fmt.Sprintf("ORDER BY %s %s", col, dir)
}

func (f QueryFilter) effectiveLimit() int {
	if f.Limit <= 0 || f.Limit > 1000 {
		return 100
	}
	return f.Limit
}
