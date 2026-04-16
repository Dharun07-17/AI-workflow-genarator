from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class LoginRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_attempts: int = 10, window_seconds: int = 60) -> None:
        super().__init__(app)
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts: dict[str, list[datetime]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path.endswith("/auth/login") and request.method.upper() == "POST":
            key = request.client.host if request.client else "unknown"
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=self.window_seconds)
            self.attempts[key] = [ts for ts in self.attempts[key] if ts > window_start]

            if len(self.attempts[key]) >= self.max_attempts:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": {"code": "RATE_LIMITED", "message": "Too many login attempts"},
                    },
                )
            self.attempts[key].append(now)

        return await call_next(request)
