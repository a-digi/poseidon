package primitive

import (
	"encoding/json"
)

func ToInt64(val interface{}) int64 {
	switch v := val.(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case float64:
		return int64(v)
	case float32:
		return int64(v)
	case json.Number:
		i, _ := v.Int64()
		return i
	case string:
		var i int64
		json.Unmarshal([]byte(v), &i)
		return i
	}

	return 0
}
