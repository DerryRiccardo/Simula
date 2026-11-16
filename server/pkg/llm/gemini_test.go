package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DerryRiccardo/Simula/server/core/entity"
)

func TestGeminiEvaluateCriterionAndComposeFeedback(t *testing.T) {
	var capturedPath string
	var capturedKey string
	var capturedParts int

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedPath = r.URL.Path
		capturedKey = r.Header.Get("x-goog-api-key")

		var req geminiGenerateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if len(req.Contents) > 0 {
			capturedParts = len(req.Contents[0].Parts)
		}

		w.Header().Set("Content-Type", "application/json")
		if len(req.GenerationConfig.ResponseSchema.Properties["strengths"].Type) > 0 {
			_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"{\"strengths\":[\"Analisis terstruktur\"],\"improvements\":[\"Tambahkan metrik\"],\"nextSteps\":[\"Lengkapi uji kasus\"]}"}]}}]}`))
			return
		}
		_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"{\"level\":4,\"reason\":\"Solusi jelas dan didukung oleh isi berkas ZIP peserta.\"}"}]}}]}`))
	}))
	defer srv.Close()

	g := NewGemini("test-key", "gemini-2.5-flash", 5*time.Second)
	g.baseURL = srv.URL

	verdict, err := g.EvaluateCriterion(context.Background(), entity.CriterionEvaluation{
		Case:      entity.Case{Title: "Backend API", Summary: "Bangun REST API"},
		Criterion: entity.RubricCriterion{Name: "Arsitektur", Weight: 50, Description: "Struktur kode rapi"},
		Content: entity.SubmissionContent{
			Note: "Sudah selesai",
			SlotValues: entity.SlotValues{
				"repo": {Text: "https://github.com/example/repo"},
			},
		},
		Attachments: []entity.SubmissionAttachment{
			{SlotKey: "zip", FileName: "project.zip", TextContent: "--- FILE: main.go ---\npackage main"},
			{SlotKey: "pdf", FileName: "design.pdf", RawData: []byte("%PDF-1.4"), MimeType: "application/pdf"},
		},
	})
	if err != nil {
		t.Fatalf("EvaluateCriterion error: %v", err)
	}
	if capturedPath != "/models/gemini-2.5-flash:generateContent" {
		t.Fatalf("unexpected path: %s", capturedPath)
	}
	if capturedKey != "test-key" {
		t.Fatalf("unexpected api key header: %s", capturedKey)
	}
	if capturedParts != 2 {
		t.Fatalf("expected 2 parts (text + pdf inlineData), got %d", capturedParts)
	}
	if verdict.Level != 4 || verdict.Reason == "" {
		t.Fatalf("unexpected verdict: %+v", verdict)
	}

	feedback, err := g.ComposeFeedback(context.Background(), entity.FeedbackRequest{
		Case: entity.Case{Title: "Backend API"},
		Results: []entity.CriterionResult{
			{Criterion: entity.RubricCriterion{Name: "Arsitektur", Weight: 50}, Level: 4, Reason: "Rapi"},
		},
	})
	if err != nil {
		t.Fatalf("ComposeFeedback error: %v", err)
	}
	if len(feedback.Strengths) != 1 || len(feedback.Improvements) != 1 || len(feedback.NextSteps) != 1 {
		t.Fatalf("unexpected feedback: %+v", feedback)
	}
}

func TestGeminiEvaluateAll(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"{\"criteria\":[{\"position\":1,\"level\":4,\"reason\":\"Arsitektur rapi\"},{\"position\":2,\"level\":5,\"reason\":\"Dokumentasi lengkap\"}],\"strengths\":[\"Kode bersih\"],\"improvements\":[\"Tambah unit test\"],\"nextSteps\":[\"Pelajari caching\"]}"}]}}]}`))
	}))
	defer srv.Close()

	g := NewGemini("test-key", "gemini-2.5-flash", 5*time.Second)
	g.baseURL = srv.URL

	res, err := g.EvaluateAll(context.Background(), entity.BatchEvaluation{
		Case: entity.Case{
			Title: "Backend API",
			Rubric: []entity.RubricCriterion{
				{Name: "Arsitektur", Weight: 60, Description: "Struktur rapi"},
				{Name: "Dokumentasi", Weight: 40, Description: "README jelas"},
			},
		},
		Content: entity.SubmissionContent{Note: "Siap dinilai"},
	})
	if err != nil {
		t.Fatalf("EvaluateAll error: %v", err)
	}
	if len(res.Verdicts) != 2 || res.Verdicts[0].Level != 4 || res.Verdicts[1].Level != 5 {
		t.Fatalf("unexpected verdicts: %+v", res.Verdicts)
	}
	if len(res.Feedback.Strengths) != 1 || len(res.Feedback.Improvements) != 1 || len(res.Feedback.NextSteps) != 1 {
		t.Fatalf("unexpected feedback: %+v", res.Feedback)
	}
}
