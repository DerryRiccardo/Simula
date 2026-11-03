package app

import (
	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/config"
	sharedModule "github.com/DerryRiccardo/Simula/server/core/module/shared"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	publicHandler "github.com/DerryRiccardo/Simula/server/handler/public"
	studentHandler "github.com/DerryRiccardo/Simula/server/handler/student"
	"github.com/DerryRiccardo/Simula/server/pkg/llm"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
	"github.com/DerryRiccardo/Simula/server/task"
)

// newLLM memilih penilai sesuai LLM_PROVIDER. Nil berarti penilaian AI nonaktif.
func newLLM(cfg *config.Config) coreRepo.LLM {
	switch cfg.LLMProvider {
	case config.LLMProviderFake:
		return llm.NewFake(cfg.FakeLLMDelay)
	default:
		log.Warn().Msg("LLM_PROVIDER is not configured; AI grading is disabled")
		return nil
	}
}

// newGradingService dipakai worker: menilai per kriteria lalu memfinalkan lewat hook.OnReviewed.
func newGradingService(cfg *config.Config, db *gorm.DB, client *asynq.Client, model coreRepo.LLM) *sharedModule.GradingService {
	hook := newReviewHook(db)
	return sharedModule.NewGradingService(sharedModule.GradingDeps{
		Grading:    dbRepo.InitGradingRepo(db),
		Cases:      dbRepo.InitCaseRepo(db),
		LLM:        model,
		Queue:      task.NewGradingQueue(client, cfg.QueueName),
		OnReviewed: hook.OnReviewed,
	})
}

func newResultHandler(db *gorm.DB) *studentHandler.ResultHandler {
	uc := studentModule.InitResultUseCase(studentModule.ResultDeps{
		Cases:       dbRepo.InitCaseRepo(db),
		Enrollments: dbRepo.InitEnrollmentRepo(db),
		Submissions: dbRepo.InitSubmissionRepo(db),
		Reviews:     dbRepo.InitReviewRepo(db),
	})
	return studentHandler.Result(uc)
}

func newCertificateHandler(db *gorm.DB) *publicHandler.CertificateHandler {
	uc := studentModule.InitCertificateUseCase(studentModule.CertificateDeps{
		Certificates: dbRepo.InitCertificateRepo(db),
		Cases:        dbRepo.InitCaseRepo(db),
	})
	return publicHandler.Certificate(uc)
}
