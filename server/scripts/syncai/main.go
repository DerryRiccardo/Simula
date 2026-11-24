// Command syncai menyalin kontrak AI (prompt dan skema output) dari repo Simula-ML ke assets/ai, lalu
// menulis ulang manifest.json. Jalankan dari folder server:
//
//	go run ./scripts/syncai -ml ../../Simula-ML
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"

	aiassets "github.com/DerryRiccardo/Simula/server/assets/ai"
)

const targetDir = "assets/ai"

// sources memetakan berkas di assets/ai ke lokasinya di Simula-ML.
var sources = map[string]string{
	"prompts/system.md":                    "reviewer/prompts/v1/system.md",
	"prompts/case.md":                      "reviewer/prompts/v1/case.md",
	"prompts/criterion.md":                 "reviewer/prompts/v1/criterion.md",
	"prompts/feedback_system.md":           "reviewer/prompts/v1/feedback_system.md",
	"prompts/feedback.md":                  "reviewer/prompts/v1/feedback.md",
	"schemas/criterion_result.schema.json": "reviewer/schemas/criterion_result.schema.json",
	"schemas/feedback_result.schema.json":  "reviewer/schemas/feedback_result.schema.json",
}

const versionSource = "reviewer/prompts/v1/builder.py"

var versionPattern = regexp.MustCompile(`(?m)^PROMPT_VERSION\s*=\s*"([^"]+)"`)

func main() {
	mlDir := flag.String("ml", "", "folder repo Simula-ML")
	flag.Parse()
	if err := run(*mlDir); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(mlDir string) error {
	if mlDir == "" {
		return fmt.Errorf("flag -ml is required")
	}
	builder, err := os.ReadFile(filepath.Join(mlDir, versionSource))
	if err != nil {
		return fmt.Errorf("failed to read prompt version: %w", err)
	}
	match := versionPattern.FindSubmatch(builder)
	if match == nil {
		return fmt.Errorf("PROMPT_VERSION not found in %s", versionSource)
	}

	// Semua sumber dibaca dulu, supaya tidak ada salinan setengah jadi bila salah satunya hilang.
	manifest := aiassets.Manifest{PromptVersion: string(match[1]), Files: map[string]string{}}
	contents := map[string][]byte{}
	for target, source := range sources {
		content, err := os.ReadFile(filepath.Join(mlDir, source))
		if err != nil {
			return fmt.Errorf("failed to read %s: %w", source, err)
		}
		contents[target] = aiassets.Normalize(content)
		manifest.Files[target] = aiassets.Hash(content)
	}
	encoded, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode manifest: %w", err)
	}
	contents[aiassets.ManifestName] = append(encoded, '\n')

	for target, content := range contents {
		path := filepath.Join(targetDir, target)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return fmt.Errorf("failed to create folder for %s: %w", path, err)
		}
		if err := os.WriteFile(path, content, 0o644); err != nil {
			return fmt.Errorf("failed to write %s: %w", path, err)
		}
	}
	fmt.Printf("%d berkas disalin, prompt %s\n", len(sources), manifest.PromptVersion)
	return nil
}
