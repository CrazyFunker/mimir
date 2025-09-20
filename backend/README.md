# Mimir Backend

Initial scaffolding. Run locally:

```
cp .env.example .env
docker compose up --build
```

Visit http://localhost:8000/docs

## Database Migrations

This project uses Alembic to manage database migrations. To prepare the database and apply all migrations, run:

```sh
make migrate
```
