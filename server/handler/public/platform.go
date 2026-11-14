package public

import (
	"github.com/gin-gonic/gin"

	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/response"
)

// FieldOptionResponse adalah satu bidang studi aktif untuk onboarding, katalog, dan profil.
type FieldOptionResponse struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

// PublicSettingsResponse adalah pengaturan operasional platform untuk alur peserta dan admin.
type PublicSettingsResponse struct {
	ReviewSlaDays           int    `json:"reviewSlaDays"`
	MaxRevisions            int    `json:"maxRevisions"`
	RevisionExtraDays       int    `json:"revisionExtraDays"`
	RecommendationThreshold int    `json:"recommendationThreshold"`
	PassingScoreAI          int    `json:"passingScoreAi"`
	PassingScoreB2B         int    `json:"passingScoreB2b"`
	B2BStartWindowDays      int    `json:"b2bStartWindowDays"`
	PaymentWindowHours      int    `json:"paymentWindowHours"`
	WhatsappNumber          string `json:"whatsappNumber"`
}

// PlatformHandler melayani endpoint master data publik (/fields dan /settings).
type PlatformHandler struct {
	repo coreRepo.PlatformRepository
}

// Platform membuat PlatformHandler.
func Platform(repo coreRepo.PlatformRepository) *PlatformHandler {
	return &PlatformHandler{repo: repo}
}

// ListFields: GET /api/fields.
func (h *PlatformHandler) ListFields(c *gin.Context) {
	fields, err := h.repo.ListActiveFields(c.Request.Context())
	if err != nil {
		_ = c.Error(apperror.Internal(err))
		return
	}
	items := make([]FieldOptionResponse, 0, len(fields))
	for _, f := range fields {
		items = append(items, FieldOptionResponse{
			Key:         f.Key,
			Label:       f.Label,
			Description: f.Description,
		})
	}
	response.OK(c, items)
}

// GetSettings: GET /api/settings.
func (h *PlatformHandler) GetSettings(c *gin.Context) {
	s := coreRepo.LoadSettings(c.Request.Context(), h.repo)
	response.OK(c, PublicSettingsResponse{
		ReviewSlaDays:           s.ReviewSlaDays,
		MaxRevisions:            s.MaxRevisions,
		RevisionExtraDays:       s.RevisionExtraDays,
		RecommendationThreshold: s.RecommendationThreshold,
		PassingScoreAI:          s.PassingScoreAI,
		PassingScoreB2B:         s.PassingScoreB2B,
		B2BStartWindowDays:      s.B2BStartWindowDays,
		PaymentWindowHours:      s.PaymentWindowHours,
		WhatsappNumber:          s.WhatsappNumber,
	})
}
