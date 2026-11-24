package student

import (
	"context"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	hookModule "github.com/DerryRiccardo/Simula/server/core/module/hook"
	sharedModule "github.com/DerryRiccardo/Simula/server/core/module/shared"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/pkg/apperror"
	"github.com/DerryRiccardo/Simula/server/pkg/midtrans"
)

// Uji alur checkout B2B dari ujung ke ujung dengan gateway palsu asli, PaymentService, dan
// OrderHook. Database diganti penyimpanan di memori yang meniru aturan repository (satu order
// menunggu per case, enrollment "Menunggu pembayaran" dilepas saat order gagal).

type flowStore struct {
	mu          sync.Mutex
	c           entity.Case
	orders      map[string]entity.Order
	enrollments map[string]entity.Enrollment
	seq         int64
}

type flowCases struct {
	coreRepo.CaseRepository
	s *flowStore
}

func (r flowCases) GetWithBriefByID(_ context.Context, id string) (entity.Case, error) {
	if id != r.s.c.ID {
		return entity.Case{}, coreErrors.ErrCaseNotFound
	}
	return r.s.c, nil
}

func (r flowCases) GetWithBriefBySlug(_ context.Context, slug string) (entity.Case, error) {
	if slug != r.s.c.Slug {
		return entity.Case{}, coreErrors.ErrCaseNotFound
	}
	return r.s.c, nil
}

type flowUsers struct {
	coreRepo.UserRepository
}

func (flowUsers) GetByID(_ context.Context, id string) (entity.User, error) {
	return entity.User{ID: id, Name: "Rahma", Email: "rahma@simula.test"}, nil
}

type flowEnrollments struct {
	coreRepo.EnrollmentRepository
	s *flowStore
}

func (r flowEnrollments) find(userID, caseID string) (entity.Enrollment, error) {
	for _, e := range r.s.enrollments {
		if e.UserID == userID && e.CaseID == caseID {
			return e, nil
		}
	}
	return entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound
}

func (r flowEnrollments) FindByUserAndCase(_ context.Context, userID, caseID string) (entity.Enrollment, error) {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	return r.find(userID, caseID)
}

func (r flowEnrollments) FindWithCertificate(ctx context.Context, userID, caseID string) (entity.Enrollment, error) {
	return r.FindByUserAndCase(ctx, userID, caseID)
}

func (r flowEnrollments) GetByIDForUser(_ context.Context, userID, id string) (entity.Enrollment, error) {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	e, ok := r.s.enrollments[id]
	if !ok || e.UserID != userID {
		return entity.Enrollment{}, coreErrors.ErrEnrollmentNotFound
	}
	return e, nil
}

func (r flowEnrollments) GetForUser(ctx context.Context, userID, id string) (entity.Enrollment, error) {
	return r.GetByIDForUser(ctx, userID, id)
}

func (r flowEnrollments) Create(_ context.Context, e *entity.Enrollment) error {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	if _, err := r.find(e.UserID, e.CaseID); err == nil {
		return coreErrors.ErrEnrollmentExists
	}
	r.s.enrollments[e.ID] = *e
	return nil
}

func (r flowEnrollments) ActivatePaid(_ context.Context, id string, now time.Time) error {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	e, ok := r.s.enrollments[id]
	if !ok || e.Status != entity.EnrollmentPendingPayment {
		return coreErrors.ErrStatusConflict
	}
	e.Status, e.UpdatedAt = entity.EnrollmentNotStarted, now
	r.s.enrollments[id] = e
	return nil
}

func (r flowEnrollments) Start(_ context.Context, id string, startedAt time.Time) error {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	e, ok := r.s.enrollments[id]
	if !ok || e.Status != entity.EnrollmentNotStarted {
		return coreErrors.ErrStatusConflict
	}
	e.Status, e.StartedAt = entity.EnrollmentInProgress, &startedAt
	r.s.enrollments[id] = e
	return nil
}

type flowOrders struct {
	coreRepo.OrderRepository
	s *flowStore
}

func (r flowOrders) NextInvoiceSeq(context.Context) (int64, error) {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	r.s.seq++
	return r.s.seq, nil
}

func (r flowOrders) Create(_ context.Context, order *entity.Order, pending *entity.Enrollment) error {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	for _, o := range r.s.orders {
		if o.UserID == order.UserID && o.CaseID == order.CaseID && o.Status == entity.OrderAwaitingPayment {
			return coreErrors.ErrOrderAwaitingExists
		}
	}
	if pending != nil {
		existing, err := flowEnrollments{s: r.s}.find(pending.UserID, pending.CaseID)
		switch {
		case err == nil && existing.Status != entity.EnrollmentPendingPayment:
			return coreErrors.ErrStatusConflict
		case err == nil:
			order.EnrollmentID = &existing.ID
		default:
			r.s.enrollments[pending.ID] = *pending
			order.EnrollmentID = &pending.ID
		}
	}
	r.s.orders[order.ID] = *order
	return nil
}

func (r flowOrders) GetByID(_ context.Context, id string) (entity.Order, error) {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	o, ok := r.s.orders[id]
	if !ok {
		return entity.Order{}, coreErrors.ErrOrderNotFound
	}
	return o, nil
}

func (r flowOrders) GetForUser(ctx context.Context, userID, id string) (entity.Order, error) {
	o, err := r.GetByID(ctx, id)
	if err == nil && o.UserID != userID {
		return entity.Order{}, coreErrors.ErrOrderNotFound
	}
	return o, err
}

func (r flowOrders) LatestForCase(_ context.Context, userID, caseID string) (entity.Order, error) {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	var latest *entity.Order
	for _, o := range r.s.orders {
		if o.UserID == userID && o.CaseID == caseID && (latest == nil || o.InvoiceNumber > latest.InvoiceNumber) {
			o := o
			latest = &o
		}
	}
	if latest == nil {
		return entity.Order{}, coreErrors.ErrOrderNotFound
	}
	return *latest, nil
}

func (r flowOrders) Settle(_ context.Context, s entity.OrderSettlement) error {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	o, ok := r.s.orders[s.OrderID]
	if !ok || o.Status != entity.OrderAwaitingPayment {
		return coreErrors.ErrStatusConflict
	}
	o.Status, o.UpdatedAt = s.To, s.At
	if s.To == entity.OrderPaid {
		o.PaidAt = &s.At
	}
	r.s.orders[o.ID] = o
	if s.ReleaseEnrollment {
		for id, e := range r.s.enrollments {
			if e.UserID == o.UserID && e.CaseID == o.CaseID && e.Status == entity.EnrollmentPendingPayment {
				delete(r.s.enrollments, id)
			}
		}
	}
	return nil
}

func (r flowOrders) ListOverdueIDs(_ context.Context, now time.Time, limit int) ([]string, error) {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	ids := make([]string, 0)
	for _, o := range r.s.orders {
		if o.IsOverdue(now) {
			ids = append(ids, o.ID)
		}
	}
	sort.Strings(ids)
	if len(ids) > limit {
		ids = ids[:limit]
	}
	return ids, nil
}

func (r flowOrders) LinkEnrollment(_ context.Context, orderID, enrollmentID string) error {
	r.s.mu.Lock()
	defer r.s.mu.Unlock()
	o := r.s.orders[orderID]
	o.EnrollmentID = &enrollmentID
	r.s.orders[orderID] = o
	return nil
}

func (flowOrders) RecordNotification(context.Context, *entity.PaymentNotificationRecord) error {
	return nil
}

func (flowOrders) MarkNotificationProcessed(context.Context, string, time.Time) error { return nil }

type flowQueue struct{ scheduled []string }

func (q *flowQueue) ScheduleExpiry(_ context.Context, orderID string, _ time.Time) error {
	q.scheduled = append(q.scheduled, orderID)
	return nil
}

type checkoutFlow struct {
	store     *flowStore
	now       time.Time
	queue     *flowQueue
	payments  *sharedModule.PaymentService
	checkout  CheckoutUseCase
	workspace WorkspaceUseCase
}

func newCheckoutFlow(t *testing.T) *checkoutFlow {
	t.Helper()
	price := 149000
	partnerID := uuid.NewString()
	f := &checkoutFlow{
		store: &flowStore{
			c: entity.Case{
				ID: uuid.NewString(), Slug: "belibeli-pesanan-ganda", Tier: entity.TierB2B,
				Status: entity.CaseStatusPublished, Price: &price, PartnerID: &partnerID,
			},
			orders:      map[string]entity.Order{},
			enrollments: map[string]entity.Enrollment{},
		},
		now:   testNow,
		queue: &flowQueue{},
	}
	clock := func() time.Time { return f.now }
	cases, enrollments, orders := flowCases{s: f.store}, flowEnrollments{s: f.store}, flowOrders{s: f.store}
	gateway := midtrans.NewFake()
	hook := hookModule.NewOrderHook(hookModule.OrderHookDeps{Orders: orders, Enrollments: enrollments, Now: clock})
	f.payments = sharedModule.NewPaymentService(sharedModule.PaymentDeps{
		Orders: orders, Gateway: gateway, OnOrderPaid: hook.OnOrderPaid, Now: clock,
	})
	f.checkout = InitCheckoutUseCase(CheckoutDeps{
		Cases: cases, Enrollments: enrollments, Users: flowUsers{}, Orders: orders,
		Gateway: gateway, Simulator: gateway, Payments: f.payments, Queue: f.queue, Now: clock,
	})
	f.workspace = InitWorkspaceUseCase(WorkspaceDeps{Cases: cases, Enrollments: enrollments, Now: clock})
	return f
}

func (f *checkoutFlow) enrollment(t *testing.T) *entity.Enrollment {
	t.Helper()
	summary, err := f.checkout.GetCheckout(asStudent(), f.store.c.Slug)
	require.NoError(t, err)
	return summary.Enrollment
}

func TestCheckoutFlow_VirtualAccountPaidThenStart(t *testing.T) {
	f := newCheckoutFlow(t)

	order, err := f.checkout.CreateOrder(asStudent(), f.store.c.ID, entity.PaymentVABCA)
	require.NoError(t, err)
	assert.Equal(t, entity.OrderAwaitingPayment, order.Status)
	assert.Equal(t, 149000+entity.PaymentVABCA.AdminFee(), order.Total, "total dihitung server")
	assert.NotEmpty(t, order.PaymentDetails.VANumber)
	assert.Equal(t, []string{order.ID}, f.queue.scheduled, "kedaluwarsa dijadwalkan")
	pending := f.enrollment(t)
	require.NotNil(t, pending)
	assert.Equal(t, entity.EnrollmentPendingPayment, pending.Status, "VA langsung masuk Case Saya")

	_, err = f.workspace.StartWork(asStudent(), pending.ID)
	requireKind(t, err, apperror.KindConflict)

	paid, err := f.checkout.SimulatePayment(asStudent(), order.ID, "paid")
	require.NoError(t, err)
	assert.Equal(t, entity.OrderPaid, paid.Status)
	active := f.enrollment(t)
	require.NotNil(t, active)
	assert.Equal(t, pending.ID, active.ID, "enrollment yang sama dipakai")
	assert.Equal(t, entity.EnrollmentNotStarted, active.Status)

	// Tanpa batas mulai: bisa dimulai kapan saja, termasuk berbulan-bulan setelah lunas.
	f.now = f.now.AddDate(0, 6, 0)
	started, err := f.workspace.StartWork(asStudent(), active.ID)
	require.NoError(t, err)
	assert.Equal(t, entity.EnrollmentInProgress, started.Status)

	_, err = f.checkout.CreateOrder(asStudent(), f.store.c.ID, entity.PaymentQRIS)
	requireKind(t, err, apperror.KindConflict)
}

func TestCheckoutFlow_QRISPaidCreatesEnrollment(t *testing.T) {
	f := newCheckoutFlow(t)

	order, err := f.checkout.CreateOrder(asStudent(), f.store.c.ID, entity.PaymentQRIS)
	require.NoError(t, err)
	assert.Nil(t, f.enrollment(t), "QRIS belum masuk Case Saya sebelum lunas")

	_, err = f.checkout.SimulatePayment(asStudent(), order.ID, "paid")
	require.NoError(t, err)
	active := f.enrollment(t)
	require.NotNil(t, active)
	assert.Equal(t, entity.EnrollmentNotStarted, active.Status)
	assert.Equal(t, active.ID, *f.store.orders[order.ID].EnrollmentID, "order dihubungkan ke enrollment")
}

func TestCheckoutFlow_SwitchMethodAndFailedPayment(t *testing.T) {
	f := newCheckoutFlow(t)

	first, err := f.checkout.CreateOrder(asStudent(), f.store.c.ID, entity.PaymentVABNI)
	require.NoError(t, err)
	pending := f.enrollment(t)

	second, err := f.checkout.CreateOrder(asStudent(), f.store.c.ID, entity.PaymentVAMandiri)
	require.NoError(t, err)
	assert.Equal(t, entity.OrderCancelled, f.store.orders[first.ID].Status, "order lama dibatalkan")
	assert.Equal(t, pending.ID, *second.EnrollmentID, "enrollment menunggu dipakai ulang")

	failed, err := f.checkout.SimulatePayment(asStudent(), second.ID, "failed")
	require.NoError(t, err)
	assert.Equal(t, entity.OrderFailed, failed.Status)
	assert.Nil(t, f.enrollment(t), "enrollment dilepas sehingga bisa bayar ulang")

	retry, err := f.checkout.CreateOrder(asStudent(), f.store.c.ID, entity.PaymentGoPay)
	require.NoError(t, err)
	_, err = f.checkout.SimulatePayment(asStudent(), retry.ID, "paid")
	require.NoError(t, err)
	assert.Equal(t, entity.EnrollmentNotStarted, f.enrollment(t).Status)
}

func TestCheckoutFlow_CancelAndExpiry(t *testing.T) {
	f := newCheckoutFlow(t)

	order, err := f.checkout.CreateOrder(asStudent(), f.store.c.ID, entity.PaymentVABCA)
	require.NoError(t, err)
	cancelled, err := f.checkout.CancelOrder(asStudent(), order.ID)
	require.NoError(t, err)
	assert.Equal(t, entity.OrderCancelled, cancelled.Status)
	assert.Nil(t, f.enrollment(t), "batal melepas enrollment")

	order, err = f.checkout.CreateOrder(asStudent(), f.store.c.ID, entity.PaymentVABCA)
	require.NoError(t, err)
	f.now = order.ExpiresAt.Add(time.Minute)
	expired, err := f.payments.ExpireOverdue(context.Background(), 10)
	require.NoError(t, err)
	assert.Equal(t, 1, expired, "pengecekan berkala mengedaluwarsakan order")
	assert.Equal(t, entity.OrderExpired, f.store.orders[order.ID].Status)
	assert.Nil(t, f.enrollment(t))

	// Notifikasi lunas yang terlambat setelah kedaluwarsa tidak mengaktifkan case.
	_, err = f.checkout.SimulatePayment(asStudent(), order.ID, "paid")
	requireKind(t, err, apperror.KindConflict)
	assert.Nil(t, f.enrollment(t))
}
