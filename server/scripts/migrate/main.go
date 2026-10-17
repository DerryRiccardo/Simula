// Command migrate menjalankan file SQL di migrations/ ke database.
//
// Pemakaian (dari folder server):
//
//	go run ./scripts/migrate up       # jalankan semua migrasi yang belum dijalankan
//	go run ./scripts/migrate down     # batalkan satu migrasi terakhir
//	go run ./scripts/migrate status   # tampilkan migrasi yang sudah dan belum dijalankan
//
// Koneksi diambil dari MIGRATION_DATABASE_URL: koneksi langsung atau pooler Supabase mode
// session (port 5432), bukan mode transaction.
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

// advisoryLockID mencegah dua proses migrasi berjalan bersamaan pada database yang sama.
const advisoryLockID = 7240133

const createTableSQL = `CREATE TABLE IF NOT EXISTS schema_migrations (
	version    integer PRIMARY KEY,
	name       text NOT NULL,
	applied_at timestamptz NOT NULL DEFAULT now()
)`

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "migrate:", err)
		os.Exit(1)
	}
}

func run() error {
	dir := flag.String("dir", "migrations", "folder file migrasi")
	flag.Usage = func() {
		fmt.Fprintln(os.Stderr, "usage: go run ./scripts/migrate [-dir migrations] up|down|status")
	}
	flag.Parse()
	if flag.NArg() != 1 {
		flag.Usage()
		return errors.New("missing command")
	}

	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("failed to load .env: %w", err)
	}
	dsn := os.Getenv("MIGRATION_DATABASE_URL")
	if dsn == "" {
		return errors.New("MIGRATION_DATABASE_URL is not set")
	}

	migrations, err := loadMigrations(os.DirFS(*dir))
	if err != nil {
		return err
	}

	ctx := context.Background()
	db, err := openDB(dsn)
	if err != nil {
		return err
	}
	defer db.Close()

	conn, err := db.Conn(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	defer conn.Close()

	if _, err := conn.ExecContext(ctx, "SELECT pg_advisory_lock($1)", advisoryLockID); err != nil {
		return fmt.Errorf("failed to acquire migration lock: %w", err)
	}
	defer func() {
		_, _ = conn.ExecContext(ctx, "SELECT pg_advisory_unlock($1)", advisoryLockID)
	}()

	if _, err := conn.ExecContext(ctx, createTableSQL); err != nil {
		return fmt.Errorf("failed to create schema_migrations: %w", err)
	}
	applied, err := appliedVersions(ctx, conn)
	if err != nil {
		return err
	}

	switch flag.Arg(0) {
	case "up":
		return migrateUp(ctx, conn, migrations, applied)
	case "down":
		return migrateDown(ctx, conn, migrations, applied)
	case "status":
		printStatus(migrations, applied)
		return nil
	default:
		flag.Usage()
		return fmt.Errorf("unknown command %q", flag.Arg(0))
	}
}

// openDB memakai simple protocol agar satu file migrasi boleh berisi banyak statement.
func openDB(dsn string) (*sql.DB, error) {
	cfg, err := pgx.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("invalid MIGRATION_DATABASE_URL: %w", err)
	}
	cfg.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	// Simple protocol di pgx mewajibkan koneksi UTF-8, apa pun encoding default server.
	cfg.RuntimeParams["client_encoding"] = "UTF8"
	return stdlib.OpenDB(*cfg), nil
}

func appliedVersions(ctx context.Context, conn *sql.Conn) (map[int]bool, error) {
	rows, err := conn.QueryContext(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return nil, fmt.Errorf("failed to read schema_migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[int]bool)
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("failed to scan version: %w", err)
		}
		applied[version] = true
	}
	return applied, rows.Err()
}

func migrateUp(ctx context.Context, conn *sql.Conn, migrations []migration, applied map[int]bool) error {
	count := 0
	for _, m := range migrations {
		if applied[m.Version] {
			continue
		}
		err := inTx(ctx, conn, func(tx *sql.Tx) error {
			if _, err := tx.ExecContext(ctx, m.Up); err != nil {
				return err
			}
			_, err := tx.ExecContext(ctx,
				"INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", m.Version, m.Name)
			return err
		})
		if err != nil {
			return fmt.Errorf("failed to apply %03d_%s: %w", m.Version, m.Name, err)
		}
		fmt.Printf("applied  %03d_%s\n", m.Version, m.Name)
		count++
	}
	if count == 0 {
		fmt.Println("no pending migrations")
	}
	return nil
}

func migrateDown(ctx context.Context, conn *sql.Conn, migrations []migration, applied map[int]bool) error {
	for i := len(migrations) - 1; i >= 0; i-- {
		m := migrations[i]
		if !applied[m.Version] {
			continue
		}
		if m.Rollback == "" {
			return fmt.Errorf("%03d_%s has no rollback section", m.Version, m.Name)
		}
		err := inTx(ctx, conn, func(tx *sql.Tx) error {
			if _, err := tx.ExecContext(ctx, m.Rollback); err != nil {
				return err
			}
			_, err := tx.ExecContext(ctx, "DELETE FROM schema_migrations WHERE version = $1", m.Version)
			return err
		})
		if err != nil {
			return fmt.Errorf("failed to roll back %03d_%s: %w", m.Version, m.Name, err)
		}
		fmt.Printf("rolled back  %03d_%s\n", m.Version, m.Name)
		return nil
	}
	fmt.Println("no applied migrations")
	return nil
}

func printStatus(migrations []migration, applied map[int]bool) {
	if len(migrations) == 0 {
		fmt.Println("no migration files")
	}
	known := make(map[int]bool, len(migrations))
	for _, m := range migrations {
		known[m.Version] = true
		mark := "[ ]"
		if applied[m.Version] {
			mark = "[x]"
		}
		fmt.Printf("%s %03d_%s\n", mark, m.Version, m.Name)
	}
	for version := range applied {
		if !known[version] {
			fmt.Printf("[!] %03d applied in database but file is missing\n", version)
		}
	}
}

func inTx(ctx context.Context, conn *sql.Conn, fn func(tx *sql.Tx) error) error {
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
