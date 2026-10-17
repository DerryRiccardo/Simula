// Package repository berisi interface untuk semua yang berada di luar core: repository database
// dan cache, serta layanan eksternal. Implementasinya ada di repository/db, repository/cache, dan pkg.
package repository

import "context"

// HealthProbe memeriksa apakah satu dependency infrastruktur bisa dijangkau.
type HealthProbe interface {
	Name() string
	Ping(ctx context.Context) error
}
