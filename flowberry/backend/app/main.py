from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from app.controllers.auth_controller import router as auth_router
from app.controllers.workflow_controller import router as workflow_router
from app.controllers.admin_controller import router as admin_router
from app.controllers.integrations_controller import router as integrations_router
from app.controllers.ai_controller import router as ai_router
from app.core.config import settings
from app.events.listeners import register_default_listeners
from app.middleware.exception_middleware import (
    AppException,
    app_exception_handler,
    unhandled_exception_handler,
)
from app.middleware.rate_limit_middleware import LoginRateLimitMiddleware
from app.observability.logging_config import configure_logging
from app.observability.tracing import configure_tracing


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    configure_tracing()
    register_default_listeners()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(workflow_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(integrations_router, prefix=settings.api_prefix)
app.include_router(ai_router, prefix=settings.api_prefix)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)
app.add_middleware(LoginRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FastAPIInstrumentor.instrument_app(app)

metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/health")
def health() -> dict:
    return {"success": True, "data": {"status": "ok"}, "message": "healthy"}
