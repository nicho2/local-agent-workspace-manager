from fastapi import status
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.schemas.common import APIError, ErrorDetails


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: ErrorDetails | None = None,
    ) -> None:
        self.status_code = status_code
        self.error = APIError(code=code, message=message, details=details or {})


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.error.model_dump())


def bad_request(code: str, message: str, details: ErrorDetails | None = None) -> AppError:
    return AppError(status.HTTP_400_BAD_REQUEST, code, message, details)


def not_found(resource: str, resource_id: str) -> AppError:
    return AppError(
        status.HTTP_404_NOT_FOUND,
        f"{resource}_not_found",
        f"{resource.replace('_', ' ').title()} not found",
        {"resource": resource, "id": resource_id},
    )


def conflict(code: str, message: str, details: ErrorDetails | None = None) -> AppError:
    return AppError(status.HTTP_409_CONFLICT, code, message, details)


def internal_error(code: str, message: str, details: ErrorDetails | None = None) -> AppError:
    return AppError(status.HTTP_500_INTERNAL_SERVER_ERROR, code, message, details)
