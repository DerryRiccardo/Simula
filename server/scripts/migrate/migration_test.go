package main

import (
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSplitSections(t *testing.T) {
	tests := []struct {
		name         string
		content      string
		wantUp       string
		wantRollback string
		wantErr      bool
	}{
		{
			name:         "up and rollback",
			content:      "-- +migrate Up\nCREATE TABLE a (id int);\n-- rollback\nDROP TABLE a;\n",
			wantUp:       "CREATE TABLE a (id int);",
			wantRollback: "DROP TABLE a;",
		},
		{
			name:    "windows line endings",
			content: "-- +migrate Up\r\nCREATE TABLE a (id int);\r\n-- rollback\r\nDROP TABLE a;\r\n",
			wantUp:  "CREATE TABLE a (id int);", wantRollback: "DROP TABLE a;",
		},
		{
			name:    "up without rollback",
			content: "-- +migrate Up\nCREATE TABLE a (id int);\n",
			wantUp:  "CREATE TABLE a (id int);",
		},
		{name: "missing up marker", content: "CREATE TABLE a (id int);\n", wantErr: true},
		{name: "empty up section", content: "-- +migrate Up\n-- rollback\nDROP TABLE a;\n", wantErr: true},
		{name: "rollback before up", content: "-- rollback\nDROP TABLE a;\n-- +migrate Up\nSELECT 1;\n", wantErr: true},
		{name: "up marker twice", content: "-- +migrate Up\nSELECT 1;\n-- +migrate Up\nSELECT 2;\n", wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			up, rollback, err := splitSections(tc.content)
			if tc.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantUp, up)
			assert.Equal(t, tc.wantRollback, rollback)
		})
	}
}

func TestLoadMigrations(t *testing.T) {
	valid := "-- +migrate Up\nSELECT 1;\n-- rollback\nSELECT 2;\n"

	tests := []struct {
		name         string
		files        fstest.MapFS
		wantVersions []int
		wantErr      bool
	}{
		{
			name: "sorted by number and ignores non sql files",
			files: fstest.MapFS{
				"002_create_cases.sql": {Data: []byte(valid)},
				"001_create_users.sql": {Data: []byte(valid)},
				"README.md":            {Data: []byte("docs")},
			},
			wantVersions: []int{1, 2},
		},
		{
			name: "duplicate number",
			files: fstest.MapFS{
				"001_create_users.sql": {Data: []byte(valid)},
				"001_create_cases.sql": {Data: []byte(valid)},
			},
			wantErr: true,
		},
		{
			name:    "invalid file name",
			files:   fstest.MapFS{"1_CreateUsers.sql": {Data: []byte(valid)}},
			wantErr: true,
		},
		{
			name:         "empty folder",
			files:        fstest.MapFS{},
			wantVersions: []int{},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := loadMigrations(tc.files)
			if tc.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			versions := make([]int, 0, len(got))
			for _, m := range got {
				versions = append(versions, m.Version)
			}
			assert.Equal(t, tc.wantVersions, versions)
		})
	}
}
