package middleware

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/bind"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

const testOrigin = "http://localhost:3000"

type signupRequest struct {
	Email string `json:"email" binding:"required,email"`
	Name  string `json:"name" binding:"required,min=3"`
}

func newTestEngine(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	bind.UseJSONFieldNames()

	engine := gin.New()
	engine.Use(RequestID(), Recovery(), CORS([]string{testOrigin}), BodyLimit(64), ErrorHandler())
	engine.NoRoute(NotFound())

	engine.GET("/ok", func(c *gin.Context) { response.OK(c, gin.H{"value": 1}) })
	engine.GET("/conflict", func(c *gin.Context) { _ = c.Error(apperror.Conflict("Batas revisi habis.")) })
	engine.GET("/internal", func(c *gin.Context) { _ = c.Error(errors.New("sql: connection refused")) })
	engine.GET("/panic", func(*gin.Context) { panic("boom") })
	engine.POST("/signup", func(c *gin.Context) {
		var req signupRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			_ = c.Error(bind.Error(err))
			return
		}
		response.Created(c, req)
	})
	return engine
}

func TestMiddleware_Responses(t *testing.T) {
	tests := []struct {
		name        string
		method      string
		path        string
		body        string
		wantStatus  int
		wantSuccess bool
		wantMessage string
		wantFields  []apperror.FieldError
	}{
		{name: "success envelope", method: http.MethodGet, path: "/ok", wantStatus: http.StatusOK, wantSuccess: true, wantMessage: "Berhasil"},
		{name: "app error mapped", method: http.MethodGet, path: "/conflict", wantStatus: http.StatusConflict, wantMessage: "Batas revisi habis."},
		{name: "internal error hides detail", method: http.MethodGet, path: "/internal", wantStatus: http.StatusInternalServerError, wantMessage: apperror.MsgInternal},
		{name: "panic recovered", method: http.MethodGet, path: "/panic", wantStatus: http.StatusInternalServerError, wantMessage: apperror.MsgInternal},
		{name: "unknown route", method: http.MethodGet, path: "/missing", wantStatus: http.StatusNotFound, wantMessage: "Endpoint tidak ditemukan."},
		{name: "wrong method", method: http.MethodDelete, path: "/ok", wantStatus: http.StatusNotFound, wantMessage: "Endpoint tidak ditemukan."},
		{
			name: "validation errors use json field names", method: http.MethodPost, path: "/signup",
			body:       `{"email":"bukan-email","name":"ab"}`,
			wantStatus: http.StatusUnprocessableEntity, wantMessage: apperror.MsgValidation,
			wantFields: []apperror.FieldError{
				{Field: "email", Message: "Format email tidak valid"},
				{Field: "name", Message: "Minimal 3 karakter"},
			},
		},
		{name: "malformed json", method: http.MethodPost, path: "/signup", body: `{"email":`, wantStatus: http.StatusBadRequest, wantMessage: "Format JSON tidak valid."},
		{name: "empty body", method: http.MethodPost, path: "/signup", wantStatus: http.StatusBadRequest, wantMessage: "Body request kosong."},
		{
			name: "body over limit", method: http.MethodPost, path: "/signup",
			body:       `{"email":"` + strings.Repeat("a", 100) + `@x.com","name":"abc"}`,
			wantStatus: http.StatusBadRequest, wantMessage: "Ukuran data yang dikirim melebihi batas.",
		},
	}

	engine := newTestEngine(t)
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			engine.ServeHTTP(rec, req)

			require.Equal(t, tc.wantStatus, rec.Code)
			var body struct {
				Success bool                  `json:"success"`
				Message string                `json:"message"`
				Errors  []apperror.FieldError `json:"errors"`
			}
			require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
			assert.Equal(t, tc.wantSuccess, body.Success)
			assert.Equal(t, tc.wantMessage, body.Message)
			if !tc.wantSuccess {
				assert.NotNil(t, body.Errors, "errors must be an array, not null")
			}
			if tc.wantFields != nil {
				assert.ElementsMatch(t, tc.wantFields, body.Errors)
			}
			assert.NotEmpty(t, rec.Header().Get(HeaderRequestID))
		})
	}
}

func TestRequestID(t *testing.T) {
	tests := []struct {
		name     string
		incoming string
		wantSame bool
	}{
		{name: "keeps safe incoming id", incoming: "abc-123", wantSame: true},
		{name: "replaces unsafe incoming id", incoming: "abc 123\n", wantSame: false},
		{name: "generates when missing", incoming: "", wantSame: false},
	}

	engine := newTestEngine(t)
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/ok", nil)
			if tc.incoming != "" {
				req.Header.Set(HeaderRequestID, tc.incoming)
			}
			rec := httptest.NewRecorder()

			engine.ServeHTTP(rec, req)

			got := rec.Header().Get(HeaderRequestID)
			assert.NotEmpty(t, got)
			assert.Equal(t, tc.wantSame, got == tc.incoming)
		})
	}
}

func TestCORS(t *testing.T) {
	tests := []struct {
		name            string
		method          string
		origin          string
		wantStatus      int
		wantAllowOrigin string
	}{
		{name: "allowed origin", method: http.MethodGet, origin: testOrigin, wantStatus: http.StatusOK, wantAllowOrigin: testOrigin},
		{name: "preflight allowed origin", method: http.MethodOptions, origin: testOrigin, wantStatus: http.StatusNoContent, wantAllowOrigin: testOrigin},
		{name: "other origin gets no cors headers", method: http.MethodGet, origin: "https://evil.example", wantStatus: http.StatusOK},
	}

	engine := newTestEngine(t)
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, "/ok", nil)
			req.Header.Set("Origin", tc.origin)
			rec := httptest.NewRecorder()

			engine.ServeHTTP(rec, req)

			assert.Equal(t, tc.wantStatus, rec.Code)
			assert.Equal(t, tc.wantAllowOrigin, rec.Header().Get("Access-Control-Allow-Origin"))
			if tc.wantAllowOrigin != "" {
				assert.Equal(t, "true", rec.Header().Get("Access-Control-Allow-Credentials"))
			}
		})
	}
}
