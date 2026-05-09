.DEFAULT_GOAL := help

BE_DIR := project/scg-asgn/backend
FE_DIR := project/scg-asgn/frontend
DEPLOY_DIR := project/scg-asgn/deployment

# ----- Local (docker compose) -------------------------------------------------

.PHONY: local-up
local-up: ## Build + start backend and frontend via docker compose
	docker compose up --build

.PHONY: local-up-detach
local-up-detach: ## Same as local-up but in the background
	docker compose up --build -d

.PHONY: local-down
local-down: ## Stop compose stack and remove containers
	docker compose down

.PHONY: local-logs
local-logs: ## Tail compose logs
	docker compose logs -f

# ----- Backend ----------------------------------------------------------------

.PHONY: be-run
be-run: ## Run backend on the host (no docker)
	cd $(BE_DIR) && mvn spring-boot:run

.PHONY: be-test
be-test: ## Run backend unit + slice tests
	cd $(BE_DIR) && mvn -B verify

.PHONY: be-build
be-build: ## Build backend docker image
	docker build -t scg-asgn-be:local $(BE_DIR)

# ----- Frontend ---------------------------------------------------------------

.PHONY: fe-install
fe-install: ## Install frontend deps
	cd $(FE_DIR) && npm ci

.PHONY: fe-run
fe-run: ## Run frontend dev server on the host (no docker)
	cd $(FE_DIR) && npm run dev

.PHONY: fe-test
fe-test: ## Run frontend tests
	cd $(FE_DIR) && npm test -- --run

.PHONY: fe-build
fe-build: ## Build frontend docker image
	docker build -t scg-asgn-fe:local $(FE_DIR)

# ----- Kustomize --------------------------------------------------------------

.PHONY: render-%
render-%: ## Render manifests for an env (e.g. make render-dev)
	kustomize build $(DEPLOY_DIR)/overlays/$*

# ----- Help -------------------------------------------------------------------

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_%-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
