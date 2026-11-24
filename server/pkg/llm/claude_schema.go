package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
)

// schemaKeysUnsupported adalah kata kunci JSON Schema yang ditolak structured outputs Claude (400).
// Batasnya tetap ditegakkan validasi di server. Sama dengan provider_schema() di Simula-ML.
var schemaKeysUnsupported = map[string]bool{
	"maxItems": true, "maxLength": true, "minLength": true, "minimum": true, "maximum": true,
	"exclusiveMinimum": true, "exclusiveMaximum": true, "multipleOf": true, "uniqueItems": true,
	"$schema": true, "$id": true, "title": true, "$defs": true,
}

type schemaMember struct {
	key   string
	value json.RawMessage
}

// providerSchema membuang kata kunci yang tidak didukung dan menyisipkan $ref. Urutan properti
// dipertahankan karena menentukan urutan field yang ditulis model.
func providerSchema(schema []byte) (json.RawMessage, error) {
	members, err := decodeMembers(schema)
	if err != nil {
		return nil, err
	}
	defs := map[string]json.RawMessage{}
	for _, member := range members {
		if member.key == "$defs" {
			if err := json.Unmarshal(member.value, &defs); err != nil {
				return nil, fmt.Errorf("failed to decode schema $defs: %w", err)
			}
		}
	}
	return convertSchema(schema, defs)
}

func convertSchema(node json.RawMessage, defs map[string]json.RawMessage) (json.RawMessage, error) {
	node = bytes.TrimSpace(node)
	if len(node) == 0 {
		return nil, fmt.Errorf("empty schema node")
	}
	switch node[0] {
	case '{':
		return convertObject(node, defs)
	case '[':
		var items []json.RawMessage
		if err := json.Unmarshal(node, &items); err != nil {
			return nil, fmt.Errorf("failed to decode schema array: %w", err)
		}
		converted := make([][]byte, 0, len(items))
		for _, item := range items {
			value, err := convertSchema(item, defs)
			if err != nil {
				return nil, err
			}
			converted = append(converted, value)
		}
		return json.RawMessage("[" + string(bytes.Join(converted, []byte(","))) + "]"), nil
	default:
		return node, nil
	}
}

func convertObject(node json.RawMessage, defs map[string]json.RawMessage) (json.RawMessage, error) {
	members, err := decodeMembers(node)
	if err != nil {
		return nil, err
	}
	parts := make([]string, 0, len(members))
	for _, member := range members {
		if member.key == "$ref" {
			var ref string
			if err := json.Unmarshal(member.value, &ref); err != nil {
				return nil, fmt.Errorf("failed to decode schema $ref: %w", err)
			}
			definition, ok := defs[ref[strings.LastIndex(ref, "/")+1:]]
			if !ok {
				return nil, fmt.Errorf("schema $ref %s not found", ref)
			}
			return convertSchema(definition, defs)
		}
		if schemaKeysUnsupported[member.key] {
			continue
		}
		value := string(bytes.TrimSpace(member.value))
		if member.key == "minItems" && value != "0" && value != "1" {
			continue
		}
		converted, err := convertSchema(member.value, defs)
		if err != nil {
			return nil, err
		}
		key, err := json.Marshal(member.key)
		if err != nil {
			return nil, fmt.Errorf("failed to encode schema key: %w", err)
		}
		parts = append(parts, string(key)+":"+string(converted))
	}
	return json.RawMessage("{" + strings.Join(parts, ",") + "}"), nil
}

// decodeMembers membaca objek JSON tanpa kehilangan urutan key.
func decodeMembers(object []byte) ([]schemaMember, error) {
	decoder := json.NewDecoder(bytes.NewReader(object))
	token, err := decoder.Token()
	if err != nil {
		return nil, fmt.Errorf("failed to decode schema object: %w", err)
	}
	if token != json.Delim('{') {
		return nil, fmt.Errorf("schema node is not an object")
	}
	var members []schemaMember
	for decoder.More() {
		token, err := decoder.Token()
		if err != nil {
			return nil, fmt.Errorf("failed to decode schema key: %w", err)
		}
		var value json.RawMessage
		if err := decoder.Decode(&value); err != nil {
			return nil, fmt.Errorf("failed to decode schema value: %w", err)
		}
		members = append(members, schemaMember{key: token.(string), value: value})
	}
	return members, nil
}
