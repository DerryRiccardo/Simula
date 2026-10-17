// Package pagination membatasi parameter page/limit dan membentuk metadata IPaginatedResponse.
package pagination

const (
	DefaultLimit = 10
	MaxLimit     = 100
)

// Pagination adalah page dan limit yang sudah di-clamp.
type Pagination struct {
	Page  int
	Limit int
}

// Meta adalah metadata pagination yang dibaca client (IPaginationMeta).
type Meta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalItems int64 `json:"totalItems"`
	TotalPages int   `json:"totalPages"`
}

// Page adalah isi data untuk endpoint list (IPaginatedResponse<T> di client).
type Page[T any] struct {
	Data     []T  `json:"data"`
	Metadata Meta `json:"metadata"`
}

// New men-clamp page ke ≥ 1 dan limit ke 1–100 (default 10 bila tidak diisi).
func New(page, limit int) *Pagination {
	if page < 1 {
		page = 1
	}
	switch {
	case limit <= 0:
		limit = DefaultLimit
	case limit > MaxLimit:
		limit = MaxLimit
	}
	return &Pagination{Page: page, Limit: limit}
}

// Offset adalah jumlah baris yang dilewati untuk halaman ini.
func (p *Pagination) Offset() int {
	return (p.Page - 1) * p.Limit
}

// Meta menghitung metadata dari total baris.
func (p *Pagination) Meta(totalItems int64) Meta {
	totalPages := int((totalItems + int64(p.Limit) - 1) / int64(p.Limit))
	return Meta{Page: p.Page, Limit: p.Limit, TotalItems: totalItems, TotalPages: totalPages}
}

// NewPage membentuk isi respons list. Slice nil diganti slice kosong agar JSON berisi [].
func NewPage[T any](items []T, p *Pagination, totalItems int64) Page[T] {
	if items == nil {
		items = []T{}
	}
	return Page[T]{Data: items, Metadata: p.Meta(totalItems)}
}
