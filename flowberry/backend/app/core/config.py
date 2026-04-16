from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Flowberry API"
    environment: str = "dev"
    api_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg2://flowberry:flowberry@postgres:5432/flowberry"
    rabbitmq_url: str = "amqp://guest:guest@rabbitmq:5672/"

    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7

    fernet_key: str = "change_me_32_byte_base64_key"

    otel_exporter_otlp_endpoint: str = "http://otel-collector:4317"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
