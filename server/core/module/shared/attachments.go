package shared

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"path"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/rs/zerolog/log"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
)

const (
	maxDownloadBytes       = entity.AIGradableMaxSizeMB * 1024 * 1024 // Sama dengan batas unggah AI case
	maxPDFBytes            = maxDownloadBytes
	maxImageBytes          = 15 * 1024 * 1024 / 4 // 3,75 MB, menjadi 5 MB setelah base64
	maxExtractedTextRunes  = 60000                // Batas teks per lampiran agar hemat token
	maxZipEntries          = 40                   // Maksimal berkas yang dibaca di dalam ZIP
	maxZipEntryUncompBytes = 2 * 1024 * 1024      // Cegah zip bomb saat membaca entri ZIP
)

var textExtensions = map[string]bool{
	"txt": true, "md": true, "csv": true, "tsv": true, "json": true,
	"sql": true, "py": true, "js": true, "jsx": true, "ts": true, "tsx": true,
	"go": true, "java": true, "rb": true, "php": true, "rs": true, "c": true,
	"cpp": true, "h": true, "cs": true, "html": true, "css": true, "scss": true,
	"yaml": true, "yml": true, "toml": true, "ini": true, "sh": true,
	"xml": true, "svg": true, "r": true, "ipynb": true,
}

// secretExtensions dan secretNames adalah berkas yang lazim berisi rahasia. Namanya tetap terlihat,
// tetapi isinya tidak dikirim ke penilai AI.
var (
	secretExtensions = map[string]bool{
		"env": true, "pem": true, "key": true, "p12": true, "pfx": true, "jks": true, "keystore": true,
	}
	secretNames = map[string]bool{
		"id_rsa": true, "id_dsa": true, "id_ecdsa": true, "id_ed25519": true,
		".npmrc": true, ".pypirc": true, ".netrc": true, ".pgpass": true, "credentials.json": true,
	}
)

var multimodalMimeByExt = map[string]string{
	"pdf":  "application/pdf",
	"png":  "image/png",
	"jpg":  "image/jpeg",
	"jpeg": "image/jpeg",
	"webp": "image/webp",
}

func loadSubmissionAttachments(
	ctx context.Context,
	filesRepo coreRepo.FileRepository,
	reader coreRepo.ObjectReader,
	userID string,
	slotValues entity.SlotValues,
) []entity.SubmissionAttachment {
	if filesRepo == nil || reader == nil || userID == "" {
		return nil
	}
	fileIDs := slotValues.FileIDs()
	if len(fileIDs) == 0 {
		return nil
	}
	records, err := filesRepo.ListByIDs(ctx, userID, fileIDs)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("failed to list submission files for AI grading")
		return nil
	}
	byID := make(map[string]entity.File, len(records))
	for _, record := range records {
		byID[record.ID] = record
	}

	keys := make([]string, 0, len(slotValues))
	for key := range slotValues {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var attachments []entity.SubmissionAttachment
	for _, slotKey := range keys {
		slot := slotValues[slotKey]
		if slot.File == nil {
			continue
		}
		record, ok := byID[slot.File.FileID]
		if !ok {
			continue
		}
		data, contentType, err := reader.GetObject(ctx, record.ObjectKey, maxDownloadBytes)
		if err != nil {
			log.Warn().Err(err).Str("file_id", record.ID).Str("object_key", record.ObjectKey).
				Msg("failed to download submission file for AI grading; falling back to metadata")
			continue
		}
		if contentType == "" {
			contentType = record.ContentType
		}
		attachments = append(attachments, extractAttachment(slotKey, record.FileName, contentType, data))
	}
	return attachments
}

func extractAttachment(slotKey, fileName, contentType string, data []byte) entity.SubmissionAttachment {
	att := entity.SubmissionAttachment{
		SlotKey:     slotKey,
		FileName:    fileName,
		ContentType: contentType,
	}
	ext := entity.FileExtension(fileName)

	if isSecretFile(fileName) {
		att.TextContent = "[Isi berkas tidak dibaca karena lazim berisi rahasia]"
		return att
	}
	if mimeType, ok := multimodalMimeByExt[ext]; ok {
		if limit := multimodalLimit(mimeType); len(data) > limit {
			att.TextContent = fmt.Sprintf("[Isi berkas tidak dibaca karena melebihi %.2f MB]", float64(limit)/(1024*1024))
			return att
		}
		att.RawData = data
		att.MimeType = mimeType
		return att
	}

	switch ext {
	case "zip":
		att.TextContent = extractZipText(data)
	case "docx", "xlsx", "pptx":
		att.TextContent = extractOfficeXMLText(data, ext)
	default:
		if textExtensions[ext] || strings.HasPrefix(contentType, "text/") || isLikelyText(data) {
			att.TextContent = truncateRunes(string(data), maxExtractedTextRunes)
		}
	}
	return att
}

func extractZipText(data []byte) string {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "[Berkas ZIP tidak dapat dibaca]"
	}

	var b strings.Builder
	b.WriteString("Daftar berkas dalam ZIP:\n")
	for _, f := range zr.File {
		if f.FileInfo().IsDir() || shouldSkipZipPath(f.Name) {
			continue
		}
		b.WriteString("- ")
		b.WriteString(f.Name)
		if isSecretFile(f.Name) {
			b.WriteString(" (isi tidak dibaca karena lazim berisi rahasia)")
		}
		b.WriteByte('\n')
	}

	readCount := 0
	for _, f := range zr.File {
		if readCount >= maxZipEntries || utf8.RuneCountInString(b.String()) >= maxExtractedTextRunes {
			break
		}
		if f.FileInfo().IsDir() || shouldSkipZipPath(f.Name) || isSecretFile(f.Name) {
			continue
		}
		ext := entity.FileExtension(f.Name)
		if !textExtensions[ext] {
			continue
		}
		content, err := readZipEntryLimited(f, maxZipEntryUncompBytes)
		if err != nil || !isLikelyText(content) {
			continue
		}
		readCount++
		b.WriteString("\n--- FILE: ")
		b.WriteString(f.Name)
		b.WriteString(" ---\n")
		b.WriteString(string(content))
		b.WriteByte('\n')
	}
	return truncateRunes(b.String(), maxExtractedTextRunes)
}

func extractOfficeXMLText(data []byte, ext string) string {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "[Berkas dokumen tidak dapat dibaca]"
	}

	var parts []string
	for _, f := range zr.File {
		if f.FileInfo().IsDir() || !strings.HasSuffix(strings.ToLower(f.Name), ".xml") {
			continue
		}
		if !isRelevantOfficeXML(ext, f.Name) {
			continue
		}
		raw, err := readZipEntryLimited(f, maxZipEntryUncompBytes)
		if err != nil {
			continue
		}
		if text := stripXMLText(raw); text != "" {
			parts = append(parts, text)
		}
	}
	if len(parts) == 0 {
		return "[Dokumen tidak berisi teks yang dapat diekstrak]"
	}
	return truncateRunes(strings.Join(parts, "\n\n"), maxExtractedTextRunes)
}

func isRelevantOfficeXML(ext, name string) bool {
	switch ext {
	case "docx":
		return name == "word/document.xml"
	case "xlsx":
		return name == "xl/sharedStrings.xml" || strings.HasPrefix(name, "xl/worksheets/sheet")
	case "pptx":
		return strings.HasPrefix(name, "ppt/slides/slide")
	default:
		return false
	}
}

func stripXMLText(raw []byte) string {
	dec := xml.NewDecoder(bytes.NewReader(raw))
	var words []string
	for {
		tok, err := dec.Token()
		if err != nil {
			break
		}
		if charData, ok := tok.(xml.CharData); ok {
			if text := strings.TrimSpace(string(charData)); text != "" {
				words = append(words, text)
			}
		}
	}
	return strings.Join(words, " ")
}

func readZipEntryLimited(f *zip.File, limit int64) ([]byte, error) {
	rc, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(io.LimitReader(rc, limit))
}

func shouldSkipZipPath(name string) bool {
	clean := path.Clean(strings.ReplaceAll(name, "\\", "/"))
	for _, segment := range strings.Split(clean, "/") {
		switch segment {
		case "__MACOSX", ".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build":
			return true
		}
	}
	base := path.Base(clean)
	return strings.HasPrefix(base, "._") || base == ".DS_Store"
}

func multimodalLimit(mimeType string) int {
	if mimeType == "application/pdf" {
		return maxPDFBytes
	}
	return maxImageBytes
}

func isSecretFile(name string) bool {
	base := strings.ToLower(path.Base(strings.ReplaceAll(name, "\\", "/")))
	if secretNames[base] || secretExtensions[entity.FileExtension(base)] {
		return true
	}
	if !strings.HasPrefix(base, ".env.") {
		return false
	}
	switch entity.FileExtension(base) {
	case "example", "sample", "template":
		return false
	}
	return true
}

func isLikelyText(data []byte) bool {
	if len(data) == 0 {
		return true
	}
	sample := data
	if len(sample) > 4096 {
		sample = sample[:4096]
	}
	if bytes.IndexByte(sample, 0) >= 0 {
		return false
	}
	return utf8.Valid(sample)
}

func truncateRunes(s string, maxRunes int) string {
	if maxRunes <= 0 || utf8.RuneCountInString(s) <= maxRunes {
		return s
	}
	var b strings.Builder
	count := 0
	for _, r := range s {
		if count >= maxRunes {
			break
		}
		b.WriteRune(r)
		count++
	}
	b.WriteString("\n...[konten dipotong karena melebihi batas panjang]")
	return b.String()
}
