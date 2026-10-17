package task

import (
	"context"
	"testing"

	"github.com/hibiken/asynq"
	"github.com/stretchr/testify/assert"
)

func TestRegister(t *testing.T) {
	noop := asynq.HandlerFunc(func(context.Context, *asynq.Task) error { return nil })

	tests := []struct {
		name    string
		entries []Entry
		wantErr bool
	}{
		{name: "no entries", entries: []Entry{}},
		{name: "valid entries", entries: []Entry{{Type: "email:send", Handler: noop}, {Type: "order:expire", Handler: noop}}},
		{name: "empty type", entries: []Entry{{Type: "", Handler: noop}}, wantErr: true},
		{name: "nil handler", entries: []Entry{{Type: "email:send"}}, wantErr: true},
		{name: "duplicate type", entries: []Entry{{Type: "email:send", Handler: noop}, {Type: "email:send", Handler: noop}}, wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := Register(asynq.NewServeMux(), tc.entries)
			if tc.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
		})
	}
}
