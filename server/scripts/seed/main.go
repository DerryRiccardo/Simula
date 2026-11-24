// Command seed membuat akun development (mahasiswa, reviewer, admin) dan case contoh. Hanya untuk
// lokal dan staging; ditolak bila APP_ENV=production. Akun dan case yang sudah ada dilewati.
//
// Pemakaian (dari folder server, setelah migrasi):
//
//	SEED_PASSWORD=<password> go run ./scripts/seed
//	SEED_PASSWORD=<password> go run ./scripts/seed -refresh-cases
//	SEED_PASSWORD=<password> go run ./scripts/seed -with-legacy-cases
//
// -refresh-cases mengganti isi case contoh yang sudah ada dengan isi JSON terbaru, selama case itu
// belum punya enrollment atau order. -with-legacy-cases ikut memasukkan case lama dari cases.json
// beserta satu enrollment B2B "sudah dibayar" untuk akun mahasiswa (case itu tidak ikut di-refresh).
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"

	"github.com/DerryRiccardo/Simula/server/config"
	"github.com/DerryRiccardo/Simula/server/core/entity"
	coreErrors "github.com/DerryRiccardo/Simula/server/core/errors"
	coreRepo "github.com/DerryRiccardo/Simula/server/core/repository"
	"github.com/DerryRiccardo/Simula/server/initializers"
	"github.com/DerryRiccardo/Simula/server/pkg/password"
	dbRepo "github.com/DerryRiccardo/Simula/server/repository/db"
)

type seedAccount struct {
	name   string
	email  string
	role   entity.Role
	fields []string
	major  string
}

// Akun mahasiswa dipakai untuk mencoba alur peserta dan enrollment contoh (-with-legacy-cases).
var accounts = []seedAccount{
	{name: "Rahma Aulia", email: "rahma.aulia@gmail.com", role: entity.RoleStudent, fields: []string{"backend", "data"}, major: "Sistem Informasi"},
	{name: "Admin Simula", email: "adminsimula@gmail.com", role: entity.RoleAdmin},
}

// studentAccount adalah akun mahasiswa pertama di accounts.
func studentAccount() (seedAccount, bool) {
	for _, account := range accounts {
		if account.role == entity.RoleStudent {
			return account, true
		}
	}
	return seedAccount{}, false
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "seed:", err)
		os.Exit(1)
	}
}

func run() error {
	withLegacyCases := flag.Bool("with-legacy-cases", false, "ikut seed case contoh lama (AI dan B2B fiktif) dari cases.json")
	refreshCases := flag.Bool("refresh-cases", false, "ganti isi case contoh yang sudah ada dengan isi cases.json")
	flag.Parse()

	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("failed to load .env: %w", err)
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if cfg.IsProduction() {
		return errors.New("refusing to seed demo accounts when APP_ENV=production")
	}
	plain := os.Getenv("SEED_PASSWORD")
	if msg := entity.ValidatePassword(plain); msg != "" {
		return fmt.Errorf("SEED_PASSWORD is invalid: %s", msg)
	}

	ctx := context.Background()
	db, err := initializers.NewDB(ctx, cfg)
	if err != nil {
		return err
	}
	defer initializers.CloseDB(db)

	users := dbRepo.InitUserRepo(db)
	hash, err := password.NewHasher().Hash(plain)
	if err != nil {
		return err
	}

	for _, account := range accounts {
		created, err := seedUser(ctx, users, account, hash)
		if err != nil {
			return fmt.Errorf("failed to seed %s: %w", account.email, err)
		}
		status := "skipped (already exists)"
		if created {
			status = "created"
		}
		fmt.Printf("%-9s %-24s %s\n", account.role, account.email, status)
	}

	if err := seedPartners(ctx, db); err != nil {
		return err
	}
	if err := seedReviewerAccounts(ctx, db, users, hash); err != nil {
		return err
	}
	if err := seedCases(ctx, db, aiCasesJSON, *refreshCases); err != nil {
		return err
	}
	if err := seedCases(ctx, db, b2bCasesJSON, *refreshCases); err != nil {
		return err
	}
	if *withLegacyCases {
		if err := seedCases(ctx, db, legacyCasesJSON, *refreshCases); err != nil {
			return err
		}
	}
	// Penugasan dibuat setelah case ada, supaya seed pertama pun langsung punya reviewer.
	if err := seedReviewerAssignments(ctx, db); err != nil {
		return err
	}
	if *withLegacyCases {
		student, ok := studentAccount()
		if !ok {
			return errors.New("no student account to own the demo enrollment")
		}
		if err := seedDemoEnrollment(ctx, db, student.email); err != nil {
			return err
		}
	}
	return nil
}

func seedUser(ctx context.Context, users coreRepo.UserRepository, account seedAccount, hash string) (bool, error) {
	if _, err := users.GetByEmail(ctx, account.email); err == nil {
		return false, nil
	} else if !errors.Is(err, coreErrors.ErrUserNotFound) {
		return false, err
	}

	now := time.Now().UTC()
	user := entity.User{
		ID:           uuid.NewString(),
		Name:         account.name,
		Email:        account.email,
		PasswordHash: &hash,
		Role:         account.role,
		IsActive:     true,
		IsOnboarded:  account.role != entity.RoleStudent,
		ShareDefault: entity.ShareDefaultAsk,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	err := users.Create(ctx, &user)
	if errors.Is(err, coreErrors.ErrEmailTaken) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if account.role == entity.RoleStudent {
		major := account.major
		if err := users.CompleteOnboarding(ctx, user.ID, account.fields, entity.StudentStatusFinalYear, &major); err != nil {
			return false, err
		}
	}
	return true, nil
}
