package pagination

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNew(t *testing.T) {
	tests := []struct {
		name      string
		page      int
		limit     int
		wantPage  int
		wantLimit int
	}{
		{name: "defaults", page: 0, limit: 0, wantPage: 1, wantLimit: DefaultLimit},
		{name: "negative values", page: -3, limit: -1, wantPage: 1, wantLimit: DefaultLimit},
		{name: "valid values", page: 3, limit: 25, wantPage: 3, wantLimit: 25},
		{name: "limit above max", page: 1, limit: 500, wantPage: 1, wantLimit: MaxLimit},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := New(tc.page, tc.limit)
			assert.Equal(t, tc.wantPage, got.Page)
			assert.Equal(t, tc.wantLimit, got.Limit)
		})
	}
}

func TestPagination_OffsetAndMeta(t *testing.T) {
	tests := []struct {
		name           string
		page           int
		limit          int
		total          int64
		wantOffset     int
		wantTotalPages int
	}{
		{name: "empty", page: 1, limit: 10, total: 0, wantOffset: 0, wantTotalPages: 0},
		{name: "exact pages", page: 2, limit: 10, total: 20, wantOffset: 10, wantTotalPages: 2},
		{name: "partial last page", page: 3, limit: 10, total: 21, wantOffset: 20, wantTotalPages: 3},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			p := New(tc.page, tc.limit)
			assert.Equal(t, tc.wantOffset, p.Offset())

			meta := p.Meta(tc.total)
			assert.Equal(t, tc.wantTotalPages, meta.TotalPages)
			assert.Equal(t, tc.total, meta.TotalItems)
		})
	}
}

func TestNewPage_NilItemsBecomeEmptySlice(t *testing.T) {
	page := NewPage[string](nil, New(1, 10), 0)

	assert.NotNil(t, page.Data)
	assert.Empty(t, page.Data)
}
