package app

import (
	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"github.com/DerryRiccardo/Simula/server/config"
	hookModule "github.com/DerryRiccardo/Simula/server/core/module/hook"
	sharedModule "github.com/DerryRiccardo/Simula/server/core/module/shared"
	studentModule "github.com/DerryRiccardo/Simula/server/core/module/student"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	studentHandler "github.com/DerryRiccardo/Simula/server/handler/student"
	"github.com/DerryRiccardo/Simula/server/pkg/midtrans"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
	"github.com/DerryRiccardo/Simula/server/task"
)

// paymentComponents berbagi satu instance gateway: gateway palsu menyimpan status transaksi di
// memori, jadi simulator dan konfirmasi status webhook harus memakai instance yang sama.
type paymentComponents struct {
	gateway   coreRepo.PaymentGateway
	simulator coreRepo.PaymentSimulator
	service   *sharedModule.PaymentService
}

// newPayments memilih gateway sesuai PAYMENT_PROVIDER. Tanpa gateway, checkout ditolak dan
// webhook tidak pernah dianggap valid.
func newPayments(cfg *config.Config, db *gorm.DB) paymentComponents {
	var components paymentComponents
	switch cfg.PaymentProvider {
	case config.PaymentProviderFake:
		fake := midtrans.NewFake()
		components.gateway, components.simulator = fake, fake
	default:
		log.Warn().Msg("PAYMENT_PROVIDER is not configured; B2B checkout is disabled")
		components.gateway = midtrans.Disabled{}
	}
	orders := dbRepo.InitOrderRepo(db)
	hook := hookModule.NewOrderHook(hookModule.OrderHookDeps{
		Orders:      orders,
		Enrollments: dbRepo.InitEnrollmentRepo(db),
	})
	components.service = sharedModule.NewPaymentService(sharedModule.PaymentDeps{
		Orders:      orders,
		Gateway:     components.gateway,
		OnOrderPaid: hook.OnOrderPaid,
	})
	return components
}

func newCheckoutHandler(cfg *config.Config, db *gorm.DB, payments paymentComponents, client *asynq.Client) *studentHandler.CheckoutHandler {
	uc := studentModule.InitCheckoutUseCase(studentModule.CheckoutDeps{
		Cases:       dbRepo.InitCaseRepo(db),
		Enrollments: dbRepo.InitEnrollmentRepo(db),
		Users:       dbRepo.InitUserRepo(db),
		Orders:      dbRepo.InitOrderRepo(db),
		Gateway:     payments.gateway,
		Simulator:   payments.simulator,
		Payments:    payments.service,
		Queue:       task.NewOrderQueue(client, cfg.QueueName),
	})
	return studentHandler.Checkout(uc)
}
