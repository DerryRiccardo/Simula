package app

import (
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/config"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	studentHandler "github.com/DerryRiccardo/Simula/server/handler/student"
	"github.com/DerryRiccardo/Simula/server/pkg/storage"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
)

// newStorage memakai R2 bila kredensial diisi. Tanpa kredensial, unggah berkas ditolak dengan
// error internal yang tercatat di log, sementara fitur lain tetap berjalan.
func newStorage(cfg *config.Config) coreRepo.Storage {
	if !cfg.IsStorageEnabled() {
		log.Warn().Msg("R2 storage is not configured; file uploads are disabled")
		return storage.Disabled{}
	}
	return storage.NewR2(storage.Config{
		AccountID:       cfg.R2AccountID,
		AccessKeyID:     cfg.R2AccessKeyID,
		SecretAccessKey: cfg.R2SecretAccessKey,
		Bucket:          cfg.R2Bucket,
	})
}

func newWorkspaceHandler(db *gorm.DB, store coreRepo.Storage) *studentHandler.WorkspaceHandler {
	uc := studentModule.InitWorkspaceUseCase(studentModule.WorkspaceDeps{
		Cases:       dbRepo.InitCaseRepo(db),
		Enrollments: dbRepo.InitEnrollmentRepo(db),
		Submissions: dbRepo.InitSubmissionRepo(db),
		Files:       dbRepo.InitFileRepo(db),
		Storage:     store,
	})
	return studentHandler.Workspace(uc)
}

// newUploadUseCase dipakai server (endpoint unggah) dan worker (pembersihan berkas pending).
func newUploadUseCase(cfg *config.Config, db *gorm.DB, store coreRepo.Storage) studentModule.UploadUseCase {
	return studentModule.InitUploadUseCase(studentModule.UploadDeps{
		Cases:        dbRepo.InitCaseRepo(db),
		Enrollments:  dbRepo.InitEnrollmentRepo(db),
		Submissions:  dbRepo.InitSubmissionRepo(db),
		Files:        dbRepo.InitFileRepo(db),
		Storage:      store,
		UploadURLTTL: cfg.R2UploadURLTTL,
	})
}
