
from database import engine, Base
import models  # noqa: F401  (import registers all models on Base.metadata)


def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done. All tables and enum types created in inaya_db.")


if __name__ == "__main__":
    main()