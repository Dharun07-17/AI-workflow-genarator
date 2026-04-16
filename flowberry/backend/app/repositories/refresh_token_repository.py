from datetime import datetime
from sqlalchemy.orm import Session
from app.models.refresh_token import RefreshToken


class RefreshTokenRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, token: RefreshToken) -> RefreshToken:
        self.db.add(token)
        self.db.commit()
        self.db.refresh(token)
        return token

    def get_active_by_jti(self, jti: str) -> RefreshToken | None:
        now = datetime.utcnow()
        return (
            self.db.query(RefreshToken)
            .filter(RefreshToken.jti == jti)
            .filter(RefreshToken.revoked_at.is_(None))
            .filter(RefreshToken.expires_at > now)
            .first()
        )

    def revoke(self, token: RefreshToken) -> None:
        token.revoked_at = datetime.utcnow()
        self.db.commit()
