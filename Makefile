.PHONY: setup dev test test-ci lint lint-fix format format-check build clean typecheck help
.PHONY: docker-up docker-down docker-test-up docker-test-down docker-logs

.DEFAULT_GOAL := help

# Package manager detection (prefer pnpm, fall back to npm)
PM := $(shell command -v pnpm 2>/dev/null && echo pnpm || echo npm)

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

#-----------------------------------------------------------------------------
# Development Setup
#-----------------------------------------------------------------------------

setup: ## Install dependencies and set up development environment
	@echo "$(CYAN)Installing dependencies with $(PM)...$(RESET)"
	$(PM) install
	@echo "$(GREEN)Setup complete!$(RESET)"

dev: docker-up ## Start development environment (services + watch mode)
	@echo "$(CYAN)Starting development mode...$(RESET)"
	$(PM) run dev

#-----------------------------------------------------------------------------
# Code Quality
#-----------------------------------------------------------------------------

lint: ## Run ESLint on the codebase
	@echo "$(CYAN)Running ESLint...$(RESET)"
	$(PM) run lint

lint-fix: ## Run ESLint with auto-fix
	@echo "$(CYAN)Running ESLint with auto-fix...$(RESET)"
	$(PM) run lint:fix

format: ## Format code with Prettier
	@echo "$(CYAN)Formatting code with Prettier...$(RESET)"
	$(PM) run format

format-check: ## Check code formatting without making changes
	@echo "$(CYAN)Checking code formatting...$(RESET)"
	$(PM) run format:check

typecheck: ## Run TypeScript type checking
	@echo "$(CYAN)Running TypeScript type check...$(RESET)"
	$(PM) run typecheck

#-----------------------------------------------------------------------------
# Testing
#-----------------------------------------------------------------------------

test: docker-test-up ## Run tests with test infrastructure
	@echo "$(CYAN)Running tests...$(RESET)"
	$(PM) run test
	@$(MAKE) docker-test-down

test-ci: ## Run tests in CI mode (no interactive prompts)
	@echo "$(CYAN)Running tests in CI mode...$(RESET)"
	$(PM) run test

#-----------------------------------------------------------------------------
# Build
#-----------------------------------------------------------------------------

build: ## Build all packages
	@echo "$(CYAN)Building all packages...$(RESET)"
	$(PM) run build

clean: ## Clean build artifacts and node_modules
	@echo "$(YELLOW)Cleaning build artifacts...$(RESET)"
	$(PM) run clean
	rm -rf node_modules
	rm -rf **/node_modules
	rm -rf **/dist
	rm -rf **/build
	rm -rf **/.turbo
	@echo "$(GREEN)Clean complete!$(RESET)"

#-----------------------------------------------------------------------------
# Docker Services
#-----------------------------------------------------------------------------

docker-up: ## Start development Docker services
	@echo "$(CYAN)Starting development services...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)Services started!$(RESET)"

docker-down: ## Stop development Docker services
	@echo "$(YELLOW)Stopping development services...$(RESET)"
	docker compose down

docker-test-up: ## Start test Docker services
	@echo "$(CYAN)Starting test services...$(RESET)"
	docker compose -f docker-compose.test.yml up -d --wait
	@echo "$(GREEN)Test services ready!$(RESET)"

docker-test-down: ## Stop test Docker services
	@echo "$(YELLOW)Stopping test services...$(RESET)"
	docker compose -f docker-compose.test.yml down

docker-logs: ## View Docker service logs
	docker compose logs -f

#-----------------------------------------------------------------------------
# Help
#-----------------------------------------------------------------------------

help: ## Show this help message
	@echo "$(CYAN)uniteDiscord - Available targets:$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Using package manager: $(PM)$(RESET)"
