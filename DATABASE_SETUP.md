Start docker container for postgreSQL server 

```
docker compose up -d
docker compose ps
```

## Smoke test (Python SQLAlchemy)

From the repo root (this project reads `DATABASE_URL` from `.env`):

```powershell
"F:/The project/KU-Smart-Skill-Mapping/env/Scripts/python.exe" -c "from sqlalchemy import create_engine,text; print(create_engine(open('.env').read().split('DATABASE_URL=')[-1].strip()).connect().execute(text('select version()')).scalar())"
```

Or run the provided quick test script placed in the repo root (used during setup).

## DBeaver connection steps

- Open DBeaver → Database → New Connection → PostgreSQL.
- Set:
	- Host: `localhost`
	- Port: `5432`
	- Database: `KUSSM_DB`
	- Username: `postgres`
	- Password: the value of `POSTGRES_PASSWORD` in the repo `.env`
- Driver: allow DBeaver to download the PostgreSQL JDBC driver if prompted.
- SSL: Disable for local Docker.
- Click **Test Connection** — you should see a successful connection and can run `SELECT version();`.

## Next steps
- Run Alembic migrations when ready: `alembic upgrade head` (from `backend/` with `DATABASE_URL` present).
