.PHONY: run run-server run-worker build test lint fmt redis-up redis-down migrate-up migrate-down migrate-status

run:
	APP_MODE=all go run .

run-server:
	APP_MODE=server go run .

run-worker:
	APP_MODE=worker go run .

build:
	go build -o bin/simula .

test:
	go test ./... -race -count=1

lint:
	@test -z "$$(gofmt -l .)" || (echo "file belum di-gofmt:"; gofmt -l .; exit 1)
	go vet ./...

fmt:
	gofmt -w .

redis-up:
	docker compose up -d redis

redis-down:
	docker compose down

migrate-up:
	go run ./scripts/migrate up

migrate-down:
	go run ./scripts/migrate down

migrate-status:
	go run ./scripts/migrate status
