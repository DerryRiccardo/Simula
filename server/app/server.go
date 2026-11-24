// Package app merakit dependency (wiring manual) untuk setiap APP_MODE. Konstruksi per domain
// ditaruh di file terpisah (system.go, lalu auth.go, learning.go, dst.) agar bisa dipakai server
// dan worker tanpa ditulis dua kali.
package app

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/DerryRiccardo/Simula/server/config"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	studentHandler "github.com/DerryRiccardo/Simula/server/handler/student"
	webhookHandler "github.com/DerryRiccardo/Simula/server/handler/webhook"
	"github.com/DerryRiccardo/Simula/server/initializers"
	"github.com/DerryRiccardo/Simula/server/middleware"
	"github.com/DerryRiccardo/Simula/server/router"
	"github.com/DerryRiccardo/Simula/server/task"
)

// RunServer menjalankan API HTTP sampai ctx selesai.
func RunServer(ctx context.Context, cfg *config.Config) error {
	db, err := initializers.NewDB(ctx, cfg)
	if err != nil {
		return err
	}
	defer initializers.CloseDB(db)

	engine, err := newEngine(cfg)
	if err != nil {
		return err
	}
	authUC := newAuthUseCase(cfg, db)
	auth := newAuthComponents(cfg, authUC)
	store := newStorage(cfg)

	payments := newPayments(cfg, db)
	uploadUC := newUploadUseCase(cfg, db, store)

	// Job latar belakang berjalan di proses ini (tanpa worker Asynq), sehingga APP_MODE=server
	// di production sudah lengkap: kedaluwarsa order dan pembersihan berkala.
	orderQueue := task.NewInProcessOrderQueue(payments.service)
	defer orderQueue.Shutdown()
	background := task.NewBackgroundRunner()
	background.Start(backgroundJobs(payments.service, authUC, uploadUC)...)
	defer background.Shutdown()

	// Tanpa penilai AI, queue tetap nil sehingga submit tidak membuat run penilaian.
	var gradingQueue coreRepo.GradingQueue
	gradingModel := ""
	if model := newLLM(cfg); model != nil {
		pool := task.NewInProcessGradingQueue(cfg.WorkerConcurrency, cfg.ShutdownTimeout)
		objectReader, _ := store.(coreRepo.ObjectReader)
		pool.Start(newGradingService(db, pool, objectReader, model))
		defer pool.Shutdown()
		gradingQueue = pool
		gradingModel = model.Model()
	}

	router.Register(engine, router.Handlers{
		Health:          newHealthHandler(cfg, db),
		Platform:        newPlatformHandler(db),
		Auth:            auth.auth,
		Onboarding:      auth.onboarding,
		Profile:         newProfileHandler(db),
		Learning:        newLearningHandler(db),
		Workspace:       newWorkspaceHandler(db, store, gradingQueue, gradingModel),
		Upload:          studentHandler.Upload(uploadUC),
		Result:          newResultHandler(db),
		Certificate:     newCertificateHandler(db),
		Checkout:        newCheckoutHandler(db, payments, orderQueue),
		Midtrans:        webhookHandler.Midtrans(payments.service),
		Review:          newReviewerHandler(db, store),
		AdminPartner:    newAdminPartnerHandler(db),
		AdminReview:     newAdminReviewHandler(db, store, gradingQueue, gradingModel),
		AdminCase:       newAdminCaseHandler(cfg, db, store),
		AdminOverview:   newAdminOverviewHandler(db),
		AdminMember:     newAdminMemberHandler(db),
		AdminOrder:      newAdminOrderHandler(db),
		AdminTalentPool: newAdminTalentPoolHandler(db),
		AdminField:      newAdminFieldHandler(db),
		AdminSettings:   newAdminSettingsHandler(db),
	}, auth.middlewares)

	return initializers.RunHTTPServer(ctx, cfg, initializers.NewHTTPServer(cfg, engine))
}

// newEngine memasang middleware global. Urutan penting: RequestID dan Logger paling luar agar
// panic yang ditangkap Recovery tetap tercatat dengan request ID dan status 500.
func newEngine(cfg *config.Config) (*gin.Engine, error) {
	engine, err := initializers.NewGinEngine(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create gin engine: %w", err)
	}
	engine.Use(
		middleware.RequestID(),
		middleware.Logger(),
		middleware.Recovery(),
		middleware.CORS([]string{cfg.FrontendURL}),
		middleware.BodyLimit(cfg.BodyLimitBytes),
		middleware.ErrorHandler(),
	)
	engine.NoRoute(middleware.NotFound())
	return engine, nil
}
