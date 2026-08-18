"""Turning anything that goes wrong into the one envelope the frontend parses.

`{ "error": { "code", "message", "fields"? } }` — §5.3. The frontend's
`lib/api.ts` treats a response without this envelope as "the backend is not
speaking the contract", which for a visitor is indistinguishable from the API
being down. So every path out of here carries it: our own exceptions, FastAPI's
validation failures, a 404 on an unknown route, and whatever nobody expected.
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from faust_api.errors import AppError, DatabaseError, InternalError, ValidationError

logger = logging.getLogger(__name__)

VALIDATION_MESSAGE = "Перевірте заповнені поля"

# Pydantic reports in English; the owner reads Ukrainian.
FIELD_MESSAGES: dict[str, str] = {
    "missing": "Обов'язкове поле",
    "string_too_short": "Занадто коротке значення",
    "string_too_long": "Занадто довге значення",
    "string_pattern_mismatch": "Недопустимі символи",
    "greater_than": "Значення замале",
    "greater_than_equal": "Значення замале",
    "less_than": "Значення завелике",
    "less_than_equal": "Значення завелике",
    "int_parsing": "Потрібне ціле число",
    "int_from_float": "Потрібне ціле число",
    "int_type": "Потрібне ціле число",
    "bool_parsing": "Потрібно так або ні",
    "enum": "Недопустиме значення",
    "literal_error": "Недопустиме значення",
    "json_invalid": "Тіло запиту не є коректним JSON",
}

FALLBACK_FIELD_MESSAGE = "Некоректне значення"

# Where FastAPI reports the problem — not part of the field name.
LOCATION_PREFIXES = frozenset({"body", "query", "path", "header", "cookie"})

HTTP_CODES: dict[int, str] = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "NOT_FOUND",
    409: "SLUG_CONFLICT",
    413: "FILE_TOO_LARGE",
    415: "UNSUPPORTED_FILE",
    429: "RATE_LIMITED",
}

HTTP_MESSAGES: dict[int, str] = {
    404: "Такого ендпоінта немає",
    405: "Метод не підтримується",
}


def field_name(location: tuple[Any, ...]) -> str:
    parts = [str(part) for part in location if str(part) not in LOCATION_PREFIXES]

    return ".".join(parts) if parts else "request"


def field_message(entry: dict[str, Any]) -> str:
    kind = str(entry.get("type", ""))

    # A custom validator's own text is already in the project's voice — keep it.
    if kind == "value_error":
        raw = str(entry.get("msg", ""))
        return raw.removeprefix("Value error, ").strip() or FALLBACK_FIELD_MESSAGE

    return FIELD_MESSAGES.get(kind, FALLBACK_FIELD_MESSAGE)


def field_errors(errors: list[dict[str, Any]]) -> dict[str, str]:
    """One message per field: the first problem is the one worth showing."""
    collected: dict[str, str] = {}

    for entry in errors:
        name = field_name(tuple(entry.get("loc", ())))
        collected.setdefault(name, field_message(entry))

    return collected


def _respond(error: AppError) -> JSONResponse:
    return JSONResponse(error.envelope(), status_code=error.status)


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, error: Exception) -> JSONResponse:
        assert isinstance(error, AppError)

        context = f"{request.method} {request.url.path} → {error.status} {error.code}"

        # A 5xx is our bug and deserves a traceback; a 4xx is a normal answer.
        if error.status >= 500:
            logger.exception("[api] %s", context)
        else:
            logger.info("[api] %s: %s", context, error.message)

        return _respond(error)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, error: Exception) -> JSONResponse:
        assert isinstance(error, RequestValidationError)

        fields = field_errors([dict(entry) for entry in error.errors()])
        logger.info("[api] %s → 400 VALIDATION_ERROR %s", request.url.path, sorted(fields))

        return _respond(ValidationError(VALIDATION_MESSAGE, fields=fields))

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(request: Request, error: Exception) -> JSONResponse:
        assert isinstance(error, StarletteHTTPException)

        code = HTTP_CODES.get(error.status_code, "INTERNAL_ERROR")
        detail = error.detail if isinstance(error.detail, str) and error.detail else None
        message = HTTP_MESSAGES.get(error.status_code) or detail or InternalError().message

        wrapped = AppError(message)
        wrapped.code = code
        wrapped.status = error.status_code

        logger.info("[api] %s %s → %s %s", request.method, request.url.path, error.status_code, code)

        return _respond(wrapped)

    @app.exception_handler(SQLAlchemyError)
    async def handle_database(request: Request, error: Exception) -> JSONResponse:
        """A database that stopped answering is not "an unknown bug" — say so.

        The visitor sees the same neutral sentence either way; the difference is
        that the log names the cause and the frontend gets DATABASE_ERROR.
        """
        logger.exception("[api] %s %s: база даних не відповіла", request.method, request.url.path)

        return _respond(DatabaseError())

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, error: Exception) -> JSONResponse:
        """Nothing about the failure reaches the visitor; everything reaches the log."""
        logger.exception("[api] %s %s crashed", request.method, request.url.path)

        return _respond(InternalError())
