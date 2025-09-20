PYTHON=python

.PHONY: up down fmt lint test migrate seed

up:
	docker compose up --build

down:
	docker compose down -v

fmt:
	docker compose run --rm api black .
	docker compose run --rm api ruff check --fix .

lint:
	docker compose run --rm api ruff check .

test:
	docker compose run --rm api pytest -q

migrate:
	docker compose run --rm api alembic upgrade head

seed:
	curl -X POST http://localhost:8000/api/dev/seed || true
