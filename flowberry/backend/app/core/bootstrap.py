from uuid import uuid4
from sqlalchemy.orm import Session

from app.core.db import db_manager
from app.core.security import hash_password
from app.models import Base
from app.models.user import User
from app.services.encryption_service import EncryptionService


def init_db() -> None:
    Base.metadata.create_all(bind=db_manager.engine)


def seed_admin() -> None:
    db: Session = db_manager.get_session()
    try:
        enc = EncryptionService()
        email = "admin@flowberry.local"
        existing = db.query(User).filter(User.email_hash == enc.hash_for_lookup(email)).first()
        if existing:
            return

        admin = User(
            id=str(uuid4()),
            email_encrypted=enc.encrypt(email),
            email_hash=enc.hash_for_lookup(email),
            password_hash=hash_password("Admin123!"),
            role="admin",
            mfa_enabled=False,
            is_active=True,
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    seed_admin()
    print("Database initialized with admin user")
