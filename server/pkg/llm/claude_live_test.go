package llm

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

// TestClaudeLive memanggil Claude sungguhan dan memakai saldo API, jadi dilewati kecuali diminta:
//
//	CLAUDE_LIVE_TEST=1 ANTHROPIC_API_KEY=... go test -count=1 -v -run TestClaudeLive ./pkg/llm
func TestClaudeLive(t *testing.T) {
	if os.Getenv("CLAUDE_LIVE_TEST") != "1" {
		t.Skip("set CLAUDE_LIVE_TEST=1 untuk memanggil Claude sungguhan")
	}
	key := os.Getenv("ANTHROPIC_API_KEY")
	require.NotEmpty(t, key)
	claude, err := NewClaude(key, "claude-haiku-5-5", "low", 90*time.Second)
	require.NoError(t, err)

	c := liveCase(t)
	content := entity.SubmissionContent{SlotValues: entity.SlotValues{
		c.Slots[0].SlotKey: {File: &entity.FileRef{FileName: "proyek.zip"}},
		c.Slots[1].SlotKey: {Text: "Saya mengukur endpoint dengan autocannon lalu menjalankan EXPLAIN ANALYZE. Query memakai sequential scan pada 50.000 baris karena kolom category tidak berindeks. Saya menambah indeks lewat migrasi dan membatasi kolom sesuai output lama."},
	}}
	attachments := []entity.SubmissionAttachment{{
		SlotKey: c.Slots[0].SlotKey, FileName: "proyek.zip",
		TextContent: "--- FILE: README.md ---\nAkar masalah: filter category tanpa indeks.\nSebelum: p50 3,8 detik. Sesudah: p50 220 ms (autocannon, 100 koneksi).\n" +
			"--- FILE: migrations/001.sql ---\nCREATE INDEX idx_products_category ON products(category);\n" +
			"--- FILE: src/repository.ts ---\nexport const findByCategory = (c: string) => db.query('SELECT id, name, price FROM products WHERE category = $1', [c]);",
	}}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	startedAt := time.Now()
	results := make([]entity.CriterionResult, 0, len(c.Rubric))
	scores := make([]entity.ReviewCriterionScore, 0, len(c.Rubric))
	for _, criterion := range c.Rubric {
		verdict, err := claude.EvaluateCriterion(ctx, entity.CriterionEvaluation{Case: c, Criterion: criterion, Content: content, Attachments: attachments})
		require.NoError(t, err)
		t.Logf("%s: level %d, token input %d, output %d\n  %s", criterion.Name, verdict.Level, verdict.InputTokens, verdict.OutputTokens, verdict.Reason)
		assert.Positive(t, verdict.InputTokens)
		assert.Positive(t, verdict.OutputTokens)
		results = append(results, entity.CriterionResult{Criterion: criterion, Level: verdict.Level, Reason: verdict.Reason})
		scores = append(scores, entity.ReviewCriterionScore{Weight: criterion.Weight, Level: verdict.Level})
	}
	feedback, err := claude.ComposeFeedback(ctx, entity.FeedbackRequest{Case: c, Results: results})
	require.NoError(t, err)
	t.Logf("feedback: %+v", feedback)
	t.Logf("skor %d, durasi %s", entity.CalculateScore(scores), time.Since(startedAt).Round(100*time.Millisecond))
}

// liveCase membaca case "optimasi-api-endpoint-produk" dari data seed.
func liveCase(t *testing.T) entity.Case {
	t.Helper()
	raw, err := os.ReadFile("../../scripts/seed/data/cases.json")
	require.NoError(t, err)
	type seedCase struct {
		Slug, Title, Summary, FieldKey string
		Context                        []string
		Tasks                          []struct{ Title, Description string }
		Slots                          []struct{ Key, SlotKey, ID, Title, Description, Kind string }
		Rubric                         []struct {
			Name, Description string
			Weight            int
			LevelDescriptions []string
		}
	}
	var cases []seedCase
	if err := json.Unmarshal(raw, &cases); err != nil {
		var wrapped struct{ Cases []seedCase }
		require.NoError(t, json.Unmarshal(raw, &wrapped))
		cases = wrapped.Cases
	}
	for _, s := range cases {
		if s.Slug != "optimasi-api-endpoint-produk" {
			continue
		}
		c := entity.Case{Slug: s.Slug, Title: s.Title, Summary: s.Summary, FieldKey: s.FieldKey, Context: s.Context}
		for _, task := range s.Tasks {
			c.Tasks = append(c.Tasks, entity.CaseTask{Title: task.Title, Description: task.Description})
		}
		for _, slot := range s.Slots {
			key := slot.SlotKey + slot.Key
			if key == "" {
				key = slot.ID
			}
			c.Slots = append(c.Slots, entity.CaseSlot{SlotKey: key, Title: slot.Title, Description: slot.Description, Kind: entity.SlotKind(slot.Kind)})
		}
		for i, criterion := range s.Rubric {
			c.Rubric = append(c.Rubric, entity.RubricCriterion{Position: i + 1, Name: criterion.Name, Weight: criterion.Weight,
				Description: criterion.Description, LevelDescriptions: criterion.LevelDescriptions})
		}
		require.GreaterOrEqual(t, len(c.Slots), 2)
		require.NotEmpty(t, c.Slots[0].SlotKey)
		require.NotEmpty(t, c.Rubric)
		return c
	}
	t.Fatal("case seed tidak ditemukan")
	return entity.Case{}
}

// Data seed yang dipakai tes live diperiksa tanpa memanggil API, supaya tes live tidak gagal percuma.
func TestClaudeLiveCaseHasSpecificLevels(t *testing.T) {
	for _, criterion := range liveCase(t).Rubric {
		assert.Len(t, criterion.LevelDescriptions, entity.CriterionLevelMax)
	}
}
