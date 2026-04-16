from pydantic import BaseModel


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorBody
