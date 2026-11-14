package app

import (
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/config"
	adminModule "github.com/DerryRiccardo/Simula/server/core/module/admin"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	adminHandler "github.com/DerryRiccardo/Simula/server/handler/admin"
	"github.com/DerryRiccardo/Simula/server/pkg/password"
	"github.com/DerryRiccardo/Simula/server/pkg/secure"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
)

func newAdminPartnerHandler(db *gorm.DB) *adminHandler.PartnerHandler {
	uc := adminModule.InitPartnerUseCase(adminModule.PartnerDeps{
		Partners:    dbRepo.InitAdminPartnerRepo(db),
		Hasher:      password.NewHasher(),
		RandomBytes: secure.RandomBytes,
	})
	return adminHandler.Partner(uc)
}

func newAdminCaseHandler(cfg *config.Config, db *gorm.DB, store coreRepo.Storage) *adminHandler.CaseHandler {
	uc := adminModule.InitCaseUseCase(adminModule.CaseDeps{
		AdminCases:   dbRepo.InitAdminCaseRepo(db),
		Cases:        dbRepo.InitCaseRepo(db),
		Fields:       dbRepo.InitFieldRepo(db),
		Partners:     dbRepo.InitAdminPartnerRepo(db),
		Files:        dbRepo.InitFileRepo(db),
		Storage:      store,
		UploadURLTTL: cfg.R2UploadURLTTL,
	})
	return adminHandler.Case(uc)
}

// newAdminReviewHandler: queue nil berarti penilaian AI nonaktif, jadi Nilai ulang ditolak.
func newAdminReviewHandler(db *gorm.DB, store coreRepo.Storage, queue coreRepo.GradingQueue, gradingModel string) *adminHandler.ReviewHandler {
	uc := adminModule.InitReviewUseCase(adminModule.ReviewDeps{
		Reviews:      dbRepo.InitAdminReviewRepo(db),
		Partners:     dbRepo.InitAdminPartnerRepo(db),
		Cases:        dbRepo.InitCaseRepo(db),
		Submissions:  dbRepo.InitSubmissionRepo(db),
		Files:        dbRepo.InitFileRepo(db),
		Storage:      store,
		GradingQueue: queue,
		GradingModel: gradingModel,
	})
	return adminHandler.Review(uc)
}
