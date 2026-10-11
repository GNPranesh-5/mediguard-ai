
from backend.database import Base, engine
from backend import models  # Registers all model classes with Base


def initialize_database():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")


if __name__ == "__main__":
    initialize_database()
