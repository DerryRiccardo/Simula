package entity

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSlugify(t *testing.T) {
	assert.Equal(t, "optimasi-api-endpoint-produk", Slugify("  Optimasi API: Endpoint Produk! ", 80))
	assert.Equal(t, "analisis-caf", Slugify("Analisis Café", 80), "huruf beraksen menjadi pemisah")
	assert.Equal(t, "abc", Slugify("abc-def", 4), "potongan tidak berakhir dengan tanda hubung")
	assert.Equal(t, "", Slugify("!!!", 80))
}

func TestSlotKeys(t *testing.T) {
	keys := SlotKeys([]string{"Design doc", "Design doc", "", "2025 report", "Repositori kode"})
	assert.Equal(t, []string{"design_doc", "design_doc_2", "slot_3", "slot_4", "repositori_kode"}, keys)
}

func TestSplitHelpers(t *testing.T) {
	assert.Equal(t, StringList{"Analisis data", "Tulis memo"}, SplitLines("- Analisis data\r\n\n• Tulis memo\n  "))
	assert.Equal(t, StringList{"Paragraf satu\nlanjutan.", "Paragraf dua."}, SplitParagraphs("Paragraf satu\nlanjutan.\r\n\r\nParagraf dua.\n\n\n"))
	assert.Equal(t, StringList{"pdf", "docx"}, SplitComma(" .PDF, docx,pdf, ", true))
	assert.Equal(t, StringList{"SQL", "Excel"}, SplitComma("SQL, Excel, SQL", false))
	assert.Equal(t, StringList{}, SplitLines("   "))
}

func TestValidateMaterialUpload(t *testing.T) {
	assert.Empty(t, ValidateMaterialUpload("data.csv", 1024))
	assert.NotEmpty(t, ValidateMaterialUpload("script.exe", 1024), "format di luar daftar")
	assert.NotEmpty(t, ValidateMaterialUpload("data.csv", 0), "berkas kosong")
	assert.NotEmpty(t, ValidateMaterialUpload("data.csv", int64(MaterialMaxSizeMB)*1024*1024+1), "terlalu besar")
	assert.Equal(t, "materials/abc.pdf", MaterialObjectKey("abc", "pdf"))
}
