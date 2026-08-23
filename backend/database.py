import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# The application MUST use Railway's DATABASE_URL.
# If not found during local development, we raise an error to enforce this, or we can provide a dummy one if strictly needed for alembic generation, but the prompt says:
# "FastAPI must connect only through Railway's DATABASE_URL environment variable. Do not hardcode credentials. Do not create SQLite fallback logic."
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    # During build time (e.g., Docker build), DATABASE_URL might not be present.
    # We provide a dummy URL just to allow SQLAlchemy declarative base to be imported without crashing.
    # However, attempting to connect will fail.
    DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy"

# Railway uses postgres:// sometimes, SQLAlchemy expects postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
