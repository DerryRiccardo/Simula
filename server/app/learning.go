package app

import (
	"gorm.io/gorm"

	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	studentHandler "github.com/DerryRiccardo/Simula/server/handler/student"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
)

func newLearningHandler(db *gorm.DB) *studentHandler.LearningHandler {
	uc := studentModule.InitLearningUseCase(studentModule.LearningDeps{
		Users:        dbRepo.InitUserRepo(db),
		Cases:        dbRepo.InitCaseRepo(db),
		Enrollments:  dbRepo.InitEnrollmentRepo(db),
		Certificates: dbRepo.InitCertificateRepo(db),
	})
	return studentHandler.Learning(uc)
}
