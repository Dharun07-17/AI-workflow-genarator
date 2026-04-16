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

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"

    ollama_url: str | None = "http://ollama:11434"
    ollama_model: str = "llama2"

    # Web search (SerpAPI)
    serpapi_api_key: str | None = None
    # Prefer Google News engine for "news" queries.
    serpapi_engine: str = "google_news"
    # `tbm` applies to the `google` engine; leave unset by default.
    serpapi_tbm: str | None = None
    serpapi_num_results: int = 8
    serpapi_gl: str | None = None
    serpapi_hl: str | None = None
    # When a user asks for "news", run an additional cross-check query using the
    # Google engine in news mode. This helps catch empty/odd result shapes.
    serpapi_news_crosscheck: bool = True
    serpapi_news_crosscheck_engine: str = "google"
    serpapi_news_crosscheck_tbm: str | None = "nws"

    otel_exporter_otlp_endpoint: str = "http://otel-collector:4317"
    public_base_url: str = "http://localhost:8000"
    frontend_public_url: str = "http://localhost:5173"

    # Google Sign-In (OpenID Connect). This is the OAuth Client ID for your web app.
    # Note: this is NOT a Google API key.
    google_oauth_client_id: str | None = None

    # Ignore empty env values like `SERPAPI_NUM_RESULTS=` in `.env` to prevent
    # validation errors and allow defaults to apply.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)


settings = Settings()
