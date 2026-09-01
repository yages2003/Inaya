"""Inaya — Create all tables. Run: python create_tables.py"""
from database import engine, Base
import models  # noqa: F401

def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done. All tables and enum types created.")

if __name__ == "__main__":
    main()