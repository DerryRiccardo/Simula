package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog/log"

	aiassets "github.com/DerryRiccardo/Simula/server/assets/ai"
	"github.com/DerryRiccardo/Simula/server/core/entity"
)

const (
	defaultClaudeBaseURL = "https://api.anthropic.com"
	claudeAPIVersion     = "2023-06-01"
	// claudeMaxTokens adalah batas atas, bukan perkiraan. Thinking ikut dihitung sebagai output.
	claudeMaxTokens        = 8000
	claudeMaxResponseBytes = 2 * 1024 * 1024
	claudeErrorMaxRunes    = 300
)

var ephemeralCache = &claudeCacheControl{Type: "ephemeral"}

// Claude mengimplementasikan coreRepo.LLM memakai Claude Messages API: satu panggilan per kriteria,
// lalu satu panggilan feedback (AI-CONTEXT.md §6.1). BatchLLM sengaja tidak diimplementasikan.
//
// Tidak ada retry di sini: pengulangan diurus Asynq, supaya jumlah panggilan tidak berlipat.
type Claude struct {
	apiKey     string
	model      string
	effort     string
	baseURL    string
	httpClient *http.Client
	assets     claudeAssets
}

type claudeAssets struct {
	promptVersion   string
	system          string
	caseTemplate    string
	criterion       string
	feedbackSystem  string
	feedback        string
	criterionSchema json.RawMessage
	feedbackSchema  json.RawMessage
}

// NewClaude membuat penilai AI berbasis Claude. Error berarti kontrak AI di assets/ai rusak.
func NewClaude(apiKey, model, effort string, timeout time.Duration) (*Claude, error) {
	assets, err := loadClaudeAssets()
	if err != nil {
		return nil, err
	}
	return &Claude{
		apiKey:     strings.TrimSpace(apiKey),
		model:      strings.TrimSpace(model),
		effort:     strings.TrimSpace(effort),
		baseURL:    defaultClaudeBaseURL,
		httpClient: &http.Client{Timeout: timeout},
		assets:     assets,
	}, nil
}

func loadClaudeAssets() (claudeAssets, error) {
	manifest, err := aiassets.LoadManifest()
	if err != nil {
		return claudeAssets{}, err
	}
	assets := claudeAssets{promptVersion: manifest.PromptVersion}
	for name, target := range map[string]*string{
		"prompts/system.md":          &assets.system,
		"prompts/case.md":            &assets.caseTemplate,
		"prompts/criterion.md":       &assets.criterion,
		"prompts/feedback_system.md": &assets.feedbackSystem,
		"prompts/feedback.md":        &assets.feedback,
	} {
		if *target, err = aiassets.Text(name); err != nil {
			return claudeAssets{}, err
		}
	}
	for name, target := range map[string]*json.RawMessage{
		"schemas/criterion_result.schema.json": &assets.criterionSchema,
		"schemas/feedback_result.schema.json":  &assets.feedbackSchema,
	} {
		schema, err := aiassets.Read(name)
		if err != nil {
			return claudeAssets{}, err
		}
		if *target, err = providerSchema(schema); err != nil {
			return claudeAssets{}, fmt.Errorf("failed to convert %s: %w", name, err)
		}
	}
	return assets, nil
}

// Model mengembalikan nama model yang dicatat di ai_grading_runs.
func (c *Claude) Model() string {
	return c.model
}

// EvaluateCriterion menilai satu kriteria. Prompt disusun dari yang paling stabil ke yang paling
// berubah (sistem, case, submission, kriteria) agar submission dibaca dari prompt cache mulai
// kriteria kedua.
func (c *Claude) EvaluateCriterion(ctx context.Context, in entity.CriterionEvaluation) (entity.CriterionVerdict, error) {
	content := submissionBlocks(in.Case, in.Content, in.Attachments)
	content = append(content, claudeBlock{Type: "text", Text: criterionBlock(c.assets.criterion, in.Criterion)})

	rawJSON, usage, err := c.generateJSON(ctx, "criterion", claudeRequest{
		System: []claudeBlock{
			{Type: "text", Text: c.assets.system},
			{Type: "text", Text: caseBlock(c.assets.caseTemplate, in.Case), CacheControl: ephemeralCache},
		},
		Messages:     []claudeMessage{{Role: "user", Content: content}},
		OutputConfig: c.outputConfig(c.assets.criterionSchema),
	})
	if err != nil {
		return entity.CriterionVerdict{}, err
	}

	var out struct {
		Criterion  string   `json:"criterion"`
		Level      int      `json:"level"`
		Evidence   []string `json:"evidence"`
		Reason     string   `json:"reason"`
		Confidence string   `json:"confidence"`
		Flags      []string `json:"flags"`
	}
	if err := json.Unmarshal([]byte(rawJSON), &out); err != nil {
		return entity.CriterionVerdict{}, fmt.Errorf("failed to decode claude criterion response: %w", err)
	}
	out.Reason = strings.TrimSpace(out.Reason)
	// Alasan yang terlalu panjang ditolak dan diulang, tidak dipotong diam-diam.
	if err := entity.ValidateCriterionVerdict(out.Level, out.Reason); err != nil {
		return entity.CriterionVerdict{}, fmt.Errorf("claude returned invalid criterion verdict: %w", err)
	}
	if strings.TrimSpace(out.Criterion) != strings.TrimSpace(in.Criterion.Name) {
		return entity.CriterionVerdict{}, fmt.Errorf("claude graded criterion %q instead of %q", out.Criterion, in.Criterion.Name)
	}
	if out.Level > entity.CriterionLevelMin && len(out.Evidence) == 0 {
		return entity.CriterionVerdict{}, errors.New("claude returned no evidence for a level above 1")
	}
	if len(out.Flags) > 0 || out.Confidence == "low" {
		log.Warn().Strs("flags", out.Flags).Str("confidence", out.Confidence).Str("criterion", in.Criterion.Name).
			Msg("ai grading needs manual sampling")
	}
	return entity.CriterionVerdict{
		Level:        out.Level,
		Reason:       out.Reason,
		InputTokens:  usage.totalInput(),
		OutputTokens: usage.OutputTokens,
	}, nil
}

// ComposeFeedback menyusun feedback tiga bagian dari semua hasil kriteria.
func (c *Claude) ComposeFeedback(ctx context.Context, in entity.FeedbackRequest) (entity.ReviewFeedback, error) {
	rawJSON, _, err := c.generateJSON(ctx, "feedback", claudeRequest{
		System: []claudeBlock{{Type: "text", Text: c.assets.feedbackSystem}},
		Messages: []claudeMessage{{Role: "user", Content: []claudeBlock{
			{Type: "text", Text: feedbackBlock(c.assets.feedback, in)},
		}}},
		OutputConfig: c.outputConfig(c.assets.feedbackSchema),
	})
	if err != nil {
		return entity.ReviewFeedback{}, err
	}

	var out struct {
		Strengths    []string `json:"strengths"`
		Improvements []string `json:"improvements"`
		NextSteps    []string `json:"nextSteps"`
	}
	if err := json.Unmarshal([]byte(rawJSON), &out); err != nil {
		return entity.ReviewFeedback{}, fmt.Errorf("failed to decode claude feedback response: %w", err)
	}
	feedback := entity.ReviewFeedback{Strengths: out.Strengths, Improvements: out.Improvements, NextSteps: out.NextSteps}
	if err := entity.ValidateFeedback(feedback); err != nil {
		return entity.ReviewFeedback{}, fmt.Errorf("claude returned invalid feedback: %w", err)
	}
	return feedback, nil
}

func (c *Claude) outputConfig(schema json.RawMessage) claudeOutputConfig {
	return claudeOutputConfig{
		Effort: c.effort,
		Format: claudeOutputFormat{Type: "json_schema", Schema: schema},
	}
}

func (c *Claude) generateJSON(ctx context.Context, call string, reqBody claudeRequest) (string, claudeUsage, error) {
	reqBody.Model = c.model
	reqBody.MaxTokens = claudeMaxTokens
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", claudeUsage{}, fmt.Errorf("failed to marshal claude request: %w", err)
	}
	endpoint := strings.TrimRight(c.baseURL, "/") + "/v1/messages"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return "", claudeUsage{}, fmt.Errorf("failed to create claude request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Api-Key", c.apiKey)
	req.Header.Set("anthropic-version", claudeAPIVersion)

	startedAt := time.Now()
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", claudeUsage{}, fmt.Errorf("claude request failed: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, claudeMaxResponseBytes))
	if err != nil {
		return "", claudeUsage{}, fmt.Errorf("failed to read claude response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", claudeUsage{}, fmt.Errorf("claude API error (status %d): %s", resp.StatusCode,
			clampRunes(strings.TrimSpace(string(body)), claudeErrorMaxRunes))
	}

	var parsed claudeResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", claudeUsage{}, fmt.Errorf("failed to decode claude envelope: %w", err)
	}
	log.Info().Str("call", call).Str("model", parsed.Model).Str("prompt_version", c.assets.promptVersion).
		Str("effort", c.effort).Str("stop_reason", parsed.StopReason).
		Int("input_tokens", parsed.Usage.InputTokens).
		Int("cache_creation_input_tokens", parsed.Usage.CacheCreationInputTokens).
		Int("cache_read_input_tokens", parsed.Usage.CacheReadInputTokens).
		Int("output_tokens", parsed.Usage.OutputTokens).
		Dur("duration", time.Since(startedAt)).
		Msg("claude grading call")

	switch parsed.StopReason {
	case "end_turn", "stop_sequence":
	case "refusal":
		category := "unknown"
		if parsed.StopDetails != nil && parsed.StopDetails.Category != "" {
			category = parsed.StopDetails.Category
		}
		return "", parsed.Usage, fmt.Errorf("claude refused to grade (category %s)", category)
	default:
		return "", parsed.Usage, fmt.Errorf("claude stopped early: %s", parsed.StopReason)
	}

	var text strings.Builder
	for _, block := range parsed.Content {
		if block.Type == "text" {
			text.WriteString(block.Text)
		}
	}
	if strings.TrimSpace(text.String()) == "" {
		return "", parsed.Usage, errors.New("claude returned empty text")
	}
	return text.String(), parsed.Usage, nil
}

type claudeRequest struct {
	Model        string             `json:"model"`
	MaxTokens    int                `json:"max_tokens"`
	System       []claudeBlock      `json:"system"`
	Messages     []claudeMessage    `json:"messages"`
	OutputConfig claudeOutputConfig `json:"output_config"`
}

type claudeMessage struct {
	Role    string        `json:"role"`
	Content []claudeBlock `json:"content"`
}

type claudeBlock struct {
	Type         string              `json:"type"`
	Text         string              `json:"text,omitempty"`
	Source       *claudeSource       `json:"source,omitempty"`
	CacheControl *claudeCacheControl `json:"cache_control,omitempty"`
}

type claudeSource struct {
	Type      string `json:"type"`
	MediaType string `json:"media_type"`
	Data      string `json:"data"`
}

type claudeCacheControl struct {
	Type string `json:"type"`
}

type claudeOutputConfig struct {
	Effort string             `json:"effort"`
	Format claudeOutputFormat `json:"format"`
}

type claudeOutputFormat struct {
	Type   string          `json:"type"`
	Schema json.RawMessage `json:"schema"`
}

type claudeResponse struct {
	Model   string `json:"model"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	StopReason  string `json:"stop_reason"`
	StopDetails *struct {
		Category string `json:"category"`
	} `json:"stop_details"`
	Usage claudeUsage `json:"usage"`
}

type claudeUsage struct {
	InputTokens              int `json:"input_tokens"`
	CacheCreationInputTokens int `json:"cache_creation_input_tokens"`
	CacheReadInputTokens     int `json:"cache_read_input_tokens"`
	OutputTokens             int `json:"output_tokens"`
}

// totalInput menjumlahkan semua token input, termasuk yang ditulis ke dan dibaca dari cache.
func (u claudeUsage) totalInput() int {
	return u.InputTokens + u.CacheCreationInputTokens + u.CacheReadInputTokens
}
