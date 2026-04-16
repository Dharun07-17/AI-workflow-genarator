import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings


class EncryptionService:
    def __init__(self) -> None:
        self.fernet = Fernet(settings.fernet_key.encode())

    def encrypt(self, value: str) -> str:
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, value: str) -> str:
        return self.fernet.decrypt(value.encode()).decode()

    def hash_for_lookup(self, value: str) -> str:
        return hashlib.sha256(value.lower().strip().encode()).hexdigest()
