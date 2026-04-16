from sqlalchemy.orm import Session
from app.models.integration import Integration


class IntegrationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_user(self, user_id: str) -> list[Integration]:
        return (
            self.db.query(Integration)
            .filter(Integration.user_id == user_id)
            .order_by(Integration.created_at.desc())
            .all()
        )

    def get(self, integration_id: str) -> Integration | None:
        return self.db.query(Integration).filter(Integration.id == integration_id).first()

    def create(self, integration: Integration) -> Integration:
        self.db.add(integration)
        self.db.commit()
        self.db.refresh(integration)
        return integration

    def delete(self, integration: Integration) -> None:
        self.db.delete(integration)
        self.db.commit()
