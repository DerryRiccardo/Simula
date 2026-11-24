// Package aiassets menyimpan kontrak AI dari repo Simula-ML: teks prompt dan skema output. Berkas di
// sini tidak diedit langsung; ubah di Simula-ML lalu jalankan scripts/syncai.
package aiassets

import (
	"bytes"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
)

//go:embed manifest.json prompts/*.md schemas/*.json
var files embed.FS

// ManifestName adalah daftar berkas kontrak beserta hash-nya.
const ManifestName = "manifest.json"

// Manifest mencatat versi prompt dan hash setiap berkas saat disalin dari Simula-ML.
type Manifest struct {
	PromptVersion string            `json:"promptVersion"`
	Files         map[string]string `json:"files"`
}

// Normalize menyamakan akhir baris menjadi LF, supaya checkout di Windows tidak mengubah isi prompt.
func Normalize(content []byte) []byte {
	return bytes.ReplaceAll(content, []byte("\r\n"), []byte("\n"))
}

// Hash menghitung SHA-256 isi berkas yang sudah dinormalisasi.
func Hash(content []byte) string {
	sum := sha256.Sum256(Normalize(content))
	return hex.EncodeToString(sum[:])
}

// Read mengembalikan isi berkas kontrak, misalnya "schemas/criterion_result.schema.json".
func Read(name string) ([]byte, error) {
	content, err := files.ReadFile(name)
	if err != nil {
		return nil, fmt.Errorf("failed to read ai asset %s: %w", name, err)
	}
	return Normalize(content), nil
}

// Text mengembalikan isi berkas sebagai teks tanpa spasi di awal dan akhir.
func Text(name string) (string, error) {
	content, err := Read(name)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(content)), nil
}

// LoadManifest membaca manifest.json.
func LoadManifest() (Manifest, error) {
	content, err := Read(ManifestName)
	if err != nil {
		return Manifest{}, err
	}
	var manifest Manifest
	if err := json.Unmarshal(content, &manifest); err != nil {
		return Manifest{}, fmt.Errorf("failed to decode ai asset manifest: %w", err)
	}
	return manifest, nil
}
