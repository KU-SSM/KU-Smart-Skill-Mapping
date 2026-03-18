import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Read DB URL from environment for flexibility in dev/prod.
# Load repo root .env (one level up from backend/) so the root `.env` is authoritative.
# Example Postgres: postgresql+psycopg2://user:pass@localhost:5432/dbname
root = Path(__file__).resolve().parents[1]
load_dotenv(root / ".env")

# Fallback to local sqlite for quick development if DATABASE_URL is not set.
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{root / 'backend_dev.db'}"

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
	connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args) if connect_args else create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
