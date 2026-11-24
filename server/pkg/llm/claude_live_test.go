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
	// Submission sengaja dibuat sedang: dua dari tiga penyebab utama, kode rapi tanpa test.
	content := entity.SubmissionContent{SlotValues: entity.SlotValues{
		c.Slots[0].SlotKey: {File: &entity.FileRef{FileName: "proyek.zip"}},
		c.Slots[1].SlotKey: {Text: liveSummary},
	}}
	attachments := []entity.SubmissionAttachment{{SlotKey: c.Slots[0].SlotKey, FileName: "proyek.zip", TextContent: liveZip}}

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

const liveSummary = `Saya mengukur endpoint di data uji 50.000 produk dengan autocannon (100 koneksi, 30 detik).
Penyebab 1: filter LOWER(categories.slug) dan products.category_id tidak memakai index. EXPLAIN ANALYZE menunjukkan sequential scan 50.000 baris, 610 ms.
Penyebab 2: N+1. Log query menunjukkan satu request kategori menjalankan 2 query per produk (product_images dan reviews), total 8.335 query untuk kategori dapur.
Perbaikan: index pada products(category_id) dan categories(lower(slug)), lalu gambar utama dan rata-rata rating diambil dengan dua batch query.
Hasil: p95 3,8 detik menjadi 0,9 detik, dan query per request 8.335 menjadi 3.`

const liveZip = `--- FILE: README.md ---
# Optimasi endpoint kategori
Masalah: p95 3,8 detik karena sequential scan dan N+1 ke product_images dan reviews.
Perubahan: migrasi index dan batch query.
Hasil: p95 0,9 detik, query per request dari 8.335 menjadi 3 (autocannon, 100 koneksi, 30 detik).
Menjalankan: npm install, npm run migrate, npm start.
--- FILE: migrations/001_add_indexes.sql ---
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_categories_lower_slug ON categories (LOWER(slug));
--- FILE: src/products/repository.ts ---
export async function findByCategorySlug(slug: string): Promise<Product[]> {
  return db.query(
    'SELECT p.* FROM products p JOIN categories c ON c.id = p.category_id WHERE LOWER(c.slug) = LOWER($1) ORDER BY p.created_at DESC',
    [slug],
  );
}

export async function findMainImages(productIds: number[]): Promise<Map<number, string>> {
  const rows = await db.query(
    'SELECT DISTINCT ON (product_id) product_id, url FROM product_images WHERE product_id = ANY($1) ORDER BY product_id, position',
    [productIds],
  );
  return new Map(rows.map((row) => [row.product_id, row.url]));
}

export async function findAverageRatings(productIds: number[]): Promise<Map<number, number>> {
  const rows = await db.query(
    'SELECT product_id, AVG(rating) AS average FROM reviews WHERE product_id = ANY($1) GROUP BY product_id',
    [productIds],
  );
  return new Map(rows.map((row) => [row.product_id, Number(row.average)]));
}
--- FILE: src/products/service.ts ---
const PAGE_SIZE = 24;

export async function listProducts(slug: string, page: number): Promise<ProductPage> {
  const products = await findByCategorySlug(slug);
  const pageItems = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const ids = pageItems.map((product) => product.id);
  const [images, ratings] = await Promise.all([findMainImages(ids), findAverageRatings(ids)]);
  return toProductPage(pageItems, images, ratings, products.length, page);
}`

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
