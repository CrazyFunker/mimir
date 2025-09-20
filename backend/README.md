# Mimir Backend

Initial scaffolding. Run locally:

```
cp .env.example .env
docker compose up --build
```

Visit http://localhost:8000/docs

## pgAdmin (Database UI)

pgAdmin is included for convenient local inspection of the Postgres database.

Access: http://localhost:5050

Default credentials (defined in `docker-compose.yml`):

Email: `admin@mimir.local`  
Password: `admin`

To connect to the server inside pgAdmin, create a new server with:

- Host: `db` (or `localhost` if you prefer a direct host connection)  
- Port: `5432`  
- Username: `postgres`  
- Password: `postgres`  
- Database: `mimir`

Your saved connections will persist in the `pgadmin-data` volume.

### Changing the default email / domain

pgAdmin enforces basic email deliverability rules. We've disabled the deliverability check and explicitly allowed the `mimir.local` domain via:

```sh
PGADMIN_CONFIG_CHECK_EMAIL_DELIVERABILITY=False
PGADMIN_CONFIG_ALLOW_SPECIAL_EMAIL_DOMAINS="['mimir.local']"
```

If you want to use a different fake/local domain, add it (comma-separated) to `PGADMIN_CONFIG_ALLOW_SPECIAL_EMAIL_DOMAINS` and recreate the container.

Important: pgAdmin evaluates these environment variables as Python literals. `PGADMIN_CONFIG_ALLOW_SPECIAL_EMAIL_DOMAINS` must therefore be a valid Python list expression (e.g. `"['mimir.local', 'example.test']"`). If you omit the brackets, pgAdmin will try to interpret `mimir.local` as Python code and crash.

### Resetting pgAdmin (clear saved servers / credentials)

Because pgAdmin stores state in the named volume, remove it to reset:

```sh
docker compose down
docker volume rm backend_pgadmin-data || true
docker compose up -d
```

(`backend_` prefix may differ based on your project folder name; check with `docker volume ls | grep pgadmin`.)

## Database Migrations

This project uses Alembic to manage database migrations. To prepare the database and apply all migrations, run:

```sh
make migrate
```
