.PHONY: help install dev build preview test test-watch check fix typecheck verify clean

.DEFAULT_GOAL := help

help: ## Show this help
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

install: ## Install dependencies from the lockfile
	bun install --frozen-lockfile

dev: ## Dev server with hot reload (http://localhost:5173/fingerwise/)
	bun run dev

build: ## Production build into dist/
	bun run build

preview: ## Serve dist/ locally
	bun run preview

test: ## Run tests once
	bun run test

test-watch: ## Run tests in watch mode
	bun run test:watch

check: ## Lint and format check (Biome)
	bun run check

fix: ## Apply Biome fixes and formatting
	bun run fix

typecheck: ## Type-check with tsc
	bun run typecheck

verify: check typecheck test build ## Everything that must pass before a commit

clean: ## Remove build output
	rm -rf dist coverage
