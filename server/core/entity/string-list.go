package entity

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// StringList adalah kolom jsonb berisi array string (paragraf brief, skill, format berkas). Nilai
// nil disimpan sebagai [] agar JSON ke client tidak pernah null.
type StringList []string

// Scan mengimplementasikan sql.Scanner.
func (l *StringList) Scan(value any) error {
	var raw []byte
	switch v := value.(type) {
	case nil:
		*l = StringList{}
		return nil
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("unsupported type %T for StringList", value)
	}
	var items []string
	if err := json.Unmarshal(raw, &items); err != nil {
		return fmt.Errorf("failed to decode StringList: %w", err)
	}
	if items == nil {
		items = []string{}
	}
	*l = items
	return nil
}

// Value mengimplementasikan driver.Valuer.
func (l StringList) Value() (driver.Value, error) {
	if l == nil {
		return "[]", nil
	}
	raw, err := json.Marshal([]string(l))
	if err != nil {
		return nil, fmt.Errorf("failed to encode StringList: %w", err)
	}
	return string(raw), nil
}
