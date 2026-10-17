package apperror

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestError_HTTPStatus(t *testing.T) {
	tests := []struct {
		name string
		err  *Error
		want int
	}{
		{name: "validation", err: Validation(), want: http.StatusUnprocessableEntity},
		{name: "bad request", err: BadRequest("x"), want: http.StatusBadRequest},
		{name: "unauthenticated", err: Unauthenticated(""), want: http.StatusUnauthorized},
		{name: "forbidden", err: Forbidden(""), want: http.StatusForbidden},
		{name: "not found", err: NotFound(""), want: http.StatusNotFound},
		{name: "conflict", err: Conflict("x"), want: http.StatusConflict},
		{name: "too many requests", err: TooManyRequests(), want: http.StatusTooManyRequests},
		{name: "internal", err: Internal(errors.New("boom")), want: http.StatusInternalServerError},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, tc.err.HTTPStatus())
		})
	}
}

func TestFrom(t *testing.T) {
	cause := errors.New("db down")

	tests := []struct {
		name     string
		err      error
		wantKind Kind
		wantMsg  string
	}{
		{name: "app error passes through", err: Conflict("Batas revisi habis"), wantKind: KindConflict, wantMsg: "Batas revisi habis"},
		{name: "wrapped app error is unwrapped", err: fmt.Errorf("submit: %w", NotFound("Case tidak ditemukan")), wantKind: KindNotFound, wantMsg: "Case tidak ditemukan"},
		{name: "plain error becomes internal", err: cause, wantKind: KindInternal, wantMsg: MsgInternal},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := From(tc.err)
			assert.Equal(t, tc.wantKind, got.Kind)
			assert.Equal(t, tc.wantMsg, got.Message)
		})
	}
}

func TestInternal_KeepsCauseForLogging(t *testing.T) {
	cause := errors.New("db down")
	err := Internal(cause)

	require.ErrorIs(t, err, cause)
	assert.Equal(t, MsgInternal, err.Message)
}

func TestNotFound_DefaultMessage(t *testing.T) {
	assert.Equal(t, MsgNotFound, NotFound("").Message)
}
