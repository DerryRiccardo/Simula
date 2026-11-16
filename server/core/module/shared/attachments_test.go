package shared

import (
	"archive/zip"
	"bytes"
	"strings"
	"testing"
)

func TestExtractZipAttachment(t *testing.T) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	w1, err := zw.Create("src/main.go")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = w1.Write([]byte("package main\nfunc main() {}"))

	w2, err := zw.Create("node_modules/pkg/index.js")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = w2.Write([]byte("console.log('ignored')"))

	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}

	att := extractAttachment("kode", "submission.zip", "application/zip", buf.Bytes())
	if !strings.Contains(att.TextContent, "src/main.go") || !strings.Contains(att.TextContent, "package main") {
		t.Fatalf("expected src/main.go content in extracted zip, got:\n%s", att.TextContent)
	}
	if strings.Contains(att.TextContent, "node_modules") {
		t.Fatalf("expected node_modules to be skipped, got:\n%s", att.TextContent)
	}
}

func TestExtractPDFMultimodalAttachment(t *testing.T) {
	pdfBytes := []byte("%PDF-1.7 sample")
	att := extractAttachment("laporan", "laporan.pdf", "application/pdf", pdfBytes)
	if att.MimeType != "application/pdf" || !bytes.Equal(att.RawData, pdfBytes) {
		t.Fatalf("expected multimodal pdf attachment, got %+v", att)
	}
}
