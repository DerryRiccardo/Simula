package db

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	paginationPkg "github.com/DerryRiccardo/Simula/server/pkg/pagination"
)

// caseComputedColumns mengisi field terhitung entity.Case (gorm:"->"). Jumlah peserta tidak
// menghitung order yang belum dibayar.
const caseComputedColumns = `(SELECT count(*) FROM case_slots s WHERE s.case_id = cases.id) AS deliverable_count,
(SELECT count(*) FROM enrollments pe WHERE pe.case_id = cases.id AND pe.status <> 'pending_payment') AS participant_count,
COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM case_ratings r WHERE r.case_id = cases.id), 0)::float8 AS rating`

// caseSummaryColumns hanya memilih kolom kartu katalog, karena tabel cases lebar (brief, konteks).
const caseSummaryColumns = `cases.id, cases.slug, cases.title, cases.summary, cases.tier, cases.status,
cases.field_key, cases.level, cases.duration_label, cases.price, cases.partner_id, cases.deadline_days,
cases.passing_score, ` + caseComputedColumns

const caseDetailColumns = "cases.*, " + caseComputedColumns

type caseRepo struct {
	db *gorm.DB
}

// InitCaseRepo membuat repository katalog case.
func InitCaseRepo(db *gorm.DB) coreRepo.CaseRepository {
	return &caseRepo{db: db}
}

func (r *caseRepo) ListPublished(ctx context.Context, filter coreRepo.CaseFilter, p *paginationPkg.Pagination) ([]entity.Case, int64, error) {
	var total int64
	if err := r.publishedQuery(ctx, filter).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count cases: %w", err)
	}

	query := r.publishedQuery(ctx, filter).
		Select(caseSummaryColumns).
		Preload("Partner").
		Order(caseOrder(filter))
	if p != nil {
		query = query.Limit(p.Limit).Offset(p.Offset())
	}
	cases := make([]entity.Case, 0)
	if err := query.Find(&cases).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list cases: %w", err)
	}
	return cases, total, nil
}

func (r *caseRepo) GetPublishedBySlug(ctx context.Context, slug string) (entity.Case, error) {
	var c entity.Case
	err := r.db.WithContext(ctx).
		Select(caseDetailColumns).
		Preload("Partner").
		Preload("Slots", orderByPosition).
		Preload("Rubric", orderByPosition).
		Where("cases.slug = ? AND cases.status = ?", slug, entity.CaseStatusPublished).
		Take(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Case{}, coreErrors.ErrCaseNotFound
	}
	if err != nil {
		return entity.Case{}, fmt.Errorf("failed to get case %s: %w", slug, err)
	}
	return c, nil
}

func (r *caseRepo) GetByID(ctx context.Context, id string) (entity.Case, error) {
	var c entity.Case
	err := r.db.WithContext(ctx).Select("id", "tier", "status", "deadline_days").Where("id = ?", id).Take(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Case{}, coreErrors.ErrCaseNotFound
	}
	if err != nil {
		return entity.Case{}, fmt.Errorf("failed to get case %s: %w", id, err)
	}
	return c, nil
}

func (r *caseRepo) GetWithBriefBySlug(ctx context.Context, slug string) (entity.Case, error) {
	return r.getWithBrief(ctx, "cases.slug = ?", slug)
}

func (r *caseRepo) GetWithSlotsByID(ctx context.Context, id string) (entity.Case, error) {
	var c entity.Case
	err := r.db.WithContext(ctx).
		Select("id", "tier", "status", "deadline_days").
		Preload("Slots", orderByPosition).
		Where("id = ?", id).
		Take(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Case{}, coreErrors.ErrCaseNotFound
	}
	if err != nil {
		return entity.Case{}, fmt.Errorf("failed to get case slots %s: %w", id, err)
	}
	return c, nil
}

func (r *caseRepo) getWithBrief(ctx context.Context, condition string, value string) (entity.Case, error) {
	var c entity.Case
	err := r.db.WithContext(ctx).
		Select(caseDetailColumns).
		Preload("Partner").
		Preload("Tasks", orderByPosition).
		Preload("Slots", orderByPosition).
		Preload("Rubric", orderByPosition).
		Preload("Materials", orderByPosition).
		Preload("Materials.File").
		Where(condition, value).
		Take(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return entity.Case{}, coreErrors.ErrCaseNotFound
	}
	if err != nil {
		return entity.Case{}, fmt.Errorf("failed to get case brief %s: %w", value, err)
	}
	return c, nil
}

// publishedQuery menyaring katalog. Hanya case terbit yang tampil.
func (r *caseRepo) publishedQuery(ctx context.Context, filter coreRepo.CaseFilter) *gorm.DB {
	query := r.db.WithContext(ctx).Model(&entity.Case{}).
		Where("cases.status = ?", entity.CaseStatusPublished)
	if filter.Tier != "" {
		query = query.Where("cases.tier = ?", filter.Tier)
	}
	if filter.FieldKey != "" {
		query = query.Where("cases.field_key = ?", filter.FieldKey)
	}
	if filter.Level != "" {
		query = query.Where("cases.level = ?", filter.Level)
	}
	if filter.Search != "" {
		pattern := "%" + escapeLike(filter.Search) + "%"
		query = query.Where("cases.title ILIKE ? OR cases.summary ILIKE ?", pattern, pattern)
	}
	if filter.ExcludeUserID != "" {
		query = query.Where("NOT EXISTS (SELECT 1 FROM enrollments x WHERE x.case_id = cases.id AND x.user_id = ?)", filter.ExcludeUserID)
	}
	return query
}

// caseOrder menyusun urutan katalog. Relevance: bidang pilihan user lebih dulu, lalu yang paling
// populer. Setiap urutan diakhiri id agar halaman tetap stabil.
func caseOrder(filter coreRepo.CaseFilter) clause.OrderBy {
	var expr clause.Expr
	switch filter.Sort {
	case entity.CaseSortPopular:
		expr.SQL = "participant_count DESC, cases.id"
	case entity.CaseSortRating:
		expr.SQL = "rating DESC, participant_count DESC, cases.id"
	case entity.CaseSortPriceLow:
		expr.SQL = "COALESCE(cases.price, 0) ASC, participant_count DESC, cases.id"
	default:
		if len(filter.UserFields) == 0 {
			expr.SQL = "participant_count DESC, cases.id"
			break
		}
		expr.SQL = "(cases.field_key IN ?) DESC, participant_count DESC, cases.id"
		expr.Vars = []any{filter.UserFields}
	}
	return clause.OrderBy{Expression: expr}
}

func orderByPosition(db *gorm.DB) *gorm.DB {
	return db.Order("position")
}

// escapeLike meloloskan karakter wildcard LIKE agar input user dicari apa adanya.
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}
