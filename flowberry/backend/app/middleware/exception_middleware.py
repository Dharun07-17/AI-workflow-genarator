import traceback
from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    traceback.print_exception(exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {"code": "INTERNAL_ERROR", "message": "Unexpected server error"},
        },
    )
