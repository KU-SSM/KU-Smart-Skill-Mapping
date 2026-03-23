Start docker container for postgreSQL server 

```
docker compose up -d
docker compose ps
```

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
