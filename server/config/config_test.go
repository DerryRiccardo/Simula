package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestValidateClaude(t *testing.T) {
	valid := Config{LLMProvider: LLMProviderClaude, AnthropicAPIKey: "key", ClaudeModel: "claude-haiku-5-5", ClaudeEffort: "low", ClaudeTimeout: time.Minute}
	tests := []struct {
		name   string
		change func(c *Config)
		wantOK bool
	}{
		{name: "valid", change: func(*Config) {}, wantOK: true},
		{name: "other provider ignores claude settings", change: func(c *Config) { *c = Config{LLMProvider: LLMProviderFake} }, wantOK: true},
		{name: "missing key", change: func(c *Config) { c.AnthropicAPIKey = "  " }},
		{name: "missing model", change: func(c *Config) { c.ClaudeModel = "" }},
		{name: "unknown effort", change: func(c *Config) { c.ClaudeEffort = "rendah" }},
		{name: "zero timeout", change: func(c *Config) { c.ClaudeTimeout = 0 }},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg := valid
			tc.change(&cfg)
			assert.Equal(t, tc.wantOK, cfg.validateClaude() == nil)
		})
	}
}
