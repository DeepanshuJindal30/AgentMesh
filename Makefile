.PHONY: help up down logs ps health test-api test-web test-e2e test-load lint bootstrap k8s-validate

help:
	@echo "AgentMesh Make targets:"
	@echo "  make bootstrap  - copy .env.example to .env if missing"
	@echo "  make up         - build and start the Compose stack"
	@echo "  make down       - stop the Compose stack"
	@echo "  make logs       - follow Compose logs"
	@echo "  make ps         - show Compose services"
	@echo "  make health     - curl API health/ready"
	@echo "  make test-api   - run API unit tests locally"
	@echo "  make test-web   - run web unit tests locally"
	@echo "  make test-e2e   - Playwright smoke (stack must be up)"
	@echo "  make test-load  - k6 smoke template (requires k6 + token env)"
	@echo "  make k8s-validate - render Kustomize manifests"
	@echo "  make monitoring - start stack with observability profile"

bootstrap:
	@test -f .env || cp .env.example .env
	@echo ".env ready"

up: bootstrap
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

health:
	curl -fsS http://localhost:8000/health && echo
	curl -fsS http://localhost:8000/ready && echo

monitoring: bootstrap
	docker compose --profile monitoring up --build -d

test-api:
	cd services/api && python -m pip install -q -r requirements.txt && python -m pytest -q

test-web:
	cd apps/web && npm install && npm test

test-e2e:
	cd tests/e2e && npm install && npx playwright install chromium && npx playwright test

test-load:
	k6 run tests/load/k6-smoke.js

k8s-validate:
	kubectl kustomize infrastructure/kubernetes/ > /dev/null
	@echo "kustomize ok"
