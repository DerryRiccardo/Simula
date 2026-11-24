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

func TestExtractZipSkipsSecretFiles(t *testing.T) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	secrets := []string{".env", "app/.env.local", "config/prod.env", `win\.env`, "certs/server.pem", "certs/server.key", ".ssh/id_rsa", "credentials.json", "APP.ENV"}
	for _, name := range secrets {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = w.Write([]byte("TOKEN=RAHASIA-PALSU"))
	}
	w, err := zw.Create("src/environment.ts")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = w.Write([]byte("export const mode = 'dev'"))
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}

	att := extractAttachment("kode", "proyek.zip", "application/zip", buf.Bytes())
	if strings.Contains(att.TextContent, "RAHASIA-PALSU") {
		t.Fatalf("secret content must not reach the AI, got:\n%s", att.TextContent)
	}
	for _, name := range secrets {
		if !strings.Contains(att.TextContent, name+" (isi tidak dibaca") {
			t.Errorf("%s should be listed as unread, got:\n%s", name, att.TextContent)
		}
	}
	if !strings.Contains(att.TextContent, "export const mode") {
		t.Fatalf("regular file must still be read, got:\n%s", att.TextContent)
	}
}

func TestSecretFileUploadedDirectly(t *testing.T) {
	att := extractAttachment("kode", "prod.env", "text/plain", []byte("TOKEN=RAHASIA-PALSU"))
	if strings.Contains(att.TextContent, "RAHASIA-PALSU") || len(att.RawData) > 0 {
		t.Fatalf("secret content must not reach the AI, got %+v", att)
	}
	if isSecretFile(".env.example") || isSecretFile("environment.md") {
		t.Fatal("example env and regular files are not secrets")
	}
}

func TestMultimodalSizeLimits(t *testing.T) {
	tests := []struct {
		name     string
		size     int
		attached bool
	}{
		{"laporan.pdf", 4*1024*1024 + 1, true},
		{"laporan.pdf", maxDownloadBytes, true},
		{"laporan.pdf", maxDownloadBytes + 1, false},
		{"diagram.png", maxImageBytes, true},
		{"diagram.png", maxImageBytes + 1, false},
	}
	for _, tc := range tests {
		att := extractAttachment("berkas", tc.name, "", make([]byte, tc.size))
		if got := len(att.RawData) > 0; got != tc.attached {
			t.Errorf("%s %d bytes: attached=%v, want %v", tc.name, tc.size, got, tc.attached)
		}
		if !tc.attached && !strings.Contains(att.TextContent, "tidak dibaca karena melebihi") {
			t.Errorf("%s %d bytes: missing notice, got %q", tc.name, tc.size, att.TextContent)
		}
	}
}

func TestExtractPDFMultimodalAttachment(t *testing.T) {
	pdfBytes := []byte("%PDF-1.7 sample")
	att := extractAttachment("laporan", "laporan.pdf", "application/pdf", pdfBytes)
	if att.MimeType != "application/pdf" || !bytes.Equal(att.RawData, pdfBytes) {
		t.Fatalf("expected multimodal pdf attachment, got %+v", att)
	}
}
