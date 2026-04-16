from sqlalchemy.orm import Session
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: str) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email_hash(self, email_hash: str) -> User | None:
        return self.db.query(User).filter(User.email_hash == email_hash).first()

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
