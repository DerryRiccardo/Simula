package app

import (
	"gorm.io/gorm"

	hookModule "github.com/DerryRiccardo/Simula/server/core/module/hook"
	reviewerModule "github.com/DerryRiccardo/Simula/server/core/module/reviewer"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	reviewerHandler "github.com/DerryRiccardo/Simula/server/handler/reviewer"
	"github.com/DerryRiccardo/Simula/server/pkg/secure"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
)

// newReviewHook dipakai penilaian AI (worker) dan reviewer (server): keduanya memfinalkan hasil
// lewat hook.OnReviewed yang sama.
func newReviewHook(db *gorm.DB) *hookModule.ReviewHook {
	return hookModule.NewReviewHook(hookModule.ReviewHookDeps{
		Enrollments: dbRepo.InitEnrollmentRepo(db),
		Users:       dbRepo.InitUserRepo(db),
		Reviews:     dbRepo.InitReviewRepo(db),
		RandomBytes: secure.RandomBytes,
	})
}

func newReviewerHandler(db *gorm.DB, store coreRepo.Storage) *reviewerHandler.ReviewHandler {
	uc := reviewerModule.InitReviewUseCase(reviewerModule.ReviewDeps{
		Reviewers:  dbRepo.InitReviewerRepo(db),
		Cases:      dbRepo.InitCaseRepo(db),
		Files:      dbRepo.InitFileRepo(db),
		Storage:    store,
		OnReviewed: newReviewHook(db).OnReviewed,
	})
	return reviewerHandler.Review(uc)
}
