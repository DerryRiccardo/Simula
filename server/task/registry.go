// Package task berisi tipe task Asynq, payload, factory, dan handler-nya. Setiap task wajib
// didaftarkan lewat Register; task yang tidak terdaftar tidak pernah dijalankan worker.
package task

import (
	"fmt"

	"github.com/hibiken/asynq"
)

// Entry memasangkan tipe task dengan handler-nya.
type Entry struct {
	Type    string
	Handler asynq.Handler
}

// Register mendaftarkan semua entry ke mux. Tipe kosong, handler nil, atau tipe ganda ditolak
// supaya kesalahan registrasi gagal saat startup, bukan diam-diam saat runtime.
func Register(mux *asynq.ServeMux, entries []Entry) error {
	seen := make(map[string]struct{}, len(entries))
	for _, entry := range entries {
		if entry.Type == "" {
			return fmt.Errorf("task type must not be empty")
		}
		if entry.Handler == nil {
			return fmt.Errorf("task %s has nil handler", entry.Type)
		}
		if _, ok := seen[entry.Type]; ok {
			return fmt.Errorf("task %s registered twice", entry.Type)
		}
		seen[entry.Type] = struct{}{}
		mux.Handle(entry.Type, entry.Handler)
	}
	return nil
}
