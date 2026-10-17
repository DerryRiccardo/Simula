package main

import (
	"fmt"
	"io/fs"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

const (
	markerUp       = "-- +migrate Up"
	markerRollback = "-- rollback"
)

var fileNamePattern = regexp.MustCompile(`^(\d{3})_([a-z0-9_]+)\.sql$`)

// migration adalah satu file migrasi yang sudah dipecah menjadi bagian up dan rollback.
type migration struct {
	Version  int
	Name     string
	Up       string
	Rollback string
}

// loadMigrations membaca semua file .sql di dir, memvalidasi nama dan nomornya, lalu
// mengurutkannya berdasarkan nomor.
func loadMigrations(dir fs.FS) ([]migration, error) {
	entries, err := fs.ReadDir(dir, ".")
	if err != nil {
		return nil, fmt.Errorf("failed to read migrations dir: %w", err)
	}

	migrations := make([]migration, 0, len(entries))
	seen := make(map[int]string, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		match := fileNamePattern.FindStringSubmatch(entry.Name())
		if match == nil {
			return nil, fmt.Errorf("invalid migration file name %q: must be NNN_snake_case.sql", entry.Name())
		}
		version, err := strconv.Atoi(match[1])
		if err != nil {
			return nil, fmt.Errorf("invalid migration number in %q: %w", entry.Name(), err)
		}
		if other, ok := seen[version]; ok {
			return nil, fmt.Errorf("duplicate migration number %03d: %q and %q", version, other, entry.Name())
		}
		seen[version] = entry.Name()

		content, err := fs.ReadFile(dir, entry.Name())
		if err != nil {
			return nil, fmt.Errorf("failed to read %q: %w", entry.Name(), err)
		}
		up, rollback, err := splitSections(string(content))
		if err != nil {
			return nil, fmt.Errorf("invalid migration %q: %w", entry.Name(), err)
		}
		migrations = append(migrations, migration{Version: version, Name: match[2], Up: up, Rollback: rollback})
	}

	sort.Slice(migrations, func(i, j int) bool { return migrations[i].Version < migrations[j].Version })
	return migrations, nil
}

// splitSections memisahkan isi file menjadi SQL up (antara "-- +migrate Up" dan "-- rollback")
// dan SQL rollback (setelah "-- rollback").
func splitSections(content string) (string, string, error) {
	var up, rollback strings.Builder
	section := ""
	for _, line := range strings.Split(strings.ReplaceAll(content, "\r\n", "\n"), "\n") {
		switch strings.TrimSpace(line) {
		case markerUp:
			if section != "" {
				return "", "", fmt.Errorf("marker %q must appear once, before %q", markerUp, markerRollback)
			}
			section = markerUp
			continue
		case markerRollback:
			if section != markerUp {
				return "", "", fmt.Errorf("marker %q must come after %q", markerRollback, markerUp)
			}
			section = markerRollback
			continue
		}
		switch section {
		case markerUp:
			up.WriteString(line + "\n")
		case markerRollback:
			rollback.WriteString(line + "\n")
		}
	}

	if section == "" {
		return "", "", fmt.Errorf("missing marker %q", markerUp)
	}
	upSQL := strings.TrimSpace(up.String())
	if upSQL == "" {
		return "", "", fmt.Errorf("up section is empty")
	}
	return upSQL, strings.TrimSpace(rollback.String()), nil
}
