.PHONY: setup dev build test test-unit test-integration test-e2e lint lint-fix clean \
        docker-up docker-down docker-test-up docker-test-down db-migrate db-studio logs

# Development
setup:
	pnpm install
	docker-compose up -d
	pnpm db:migrate
	@echo "Setup complete! Run 'make dev' to start development servers."

dev:
	pnpm dev

build:
	pnpm build

# Testing
test: test-unit test-integration test-contract

test-unit:
	pnpm test:unit

test-integration:
	pnpm test:integration

test-e2e:
	pnpm test:e2e

test-contract:
	pnpm test:contract

test-watch:
	pnpm test:watch

test-coverage:
	pnpm test:coverage

# Code quality
lint:
	pnpm lint

lint-fix:
	pnpm lint:fix

type-check:
	pnpm type-check

# Docker
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-test-up:
	docker-compose -f docker-compose.test.yml up -d

docker-test-down:
	docker-compose -f docker-compose.test.yml down -v

# Database
db-migrate:
	pnpm db:migrate

db-studio:
	pnpm db:studio

db-seed:
	pnpm db:seed

# Utilities
logs:
	docker-compose logs -f

clean:
	pnpm clean
	docker-compose down -v
	rm -rf node_modules coverage .pnpm-store
