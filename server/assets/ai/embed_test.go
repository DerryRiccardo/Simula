package aiassets

import (
	"io/fs"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Gagal bila berkas kontrak diedit langsung di repo ini, bukan lewat scripts/syncai.
func TestManifestMatchesFiles(t *testing.T) {
	manifest, err := LoadManifest()
	require.NoError(t, err)
	assert.NotEmpty(t, manifest.PromptVersion)

	embedded := map[string]string{}
	err = fs.WalkDir(files, ".", func(path string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() || path == ManifestName {
			return err
		}
		content, readErr := Read(path)
		if readErr != nil {
			return readErr
		}
		embedded[path] = Hash(content)
		return nil
	})
	require.NoError(t, err)
	assert.Equal(t, manifest.Files, embedded)
}

func TestNormalizeMakesHashIndependentOfLineEndings(t *testing.T) {
	assert.Equal(t, Hash([]byte("a\nb\n")), Hash([]byte("a\r\nb\r\n")))
}

func TestReadUnknownFile(t *testing.T) {
	_, err := Text("prompts/tidak-ada.md")
	assert.Error(t, err)
}
