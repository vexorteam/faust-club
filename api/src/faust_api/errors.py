"""The exception hierarchy of the contract, §9 — here it is raised, not received.

The frontend has the mirror image of this file (`faust/src/errors/index.ts`)
and maps `code` back onto its own classes, so the list of codes is a shared
dictionary of the two applications: a new code appears here first, then there.

Two rules every message obeys:
  * it is Ukrainian, and it says what happened and what to do about it;
  * it is safe to show as-is — no stack traces, no SQL, no file paths.
"""

from typing import Any

FALLBACK_MESSAGE = "Щось пішло не так на нашому боці. Спробуйте ще раз за хвилину"


class AppError(Exception):
    """Base of everything the API answers with on purpose.

    `fields` is the per-field breakdown a form needs (§5.3); `details` never
    leaves the process — it goes to the log, not to the response.
    """

    code = "INTERNAL_ERROR"
    status = 500

    def __init__(
        self,
        message: str | None = None,
        *,
        fields: dict[str, str] | None = None,
        details: Any | None = None,
    ) -> None:
        super().__init__(message or FALLBACK_MESSAGE)
        self.message = message or FALLBACK_MESSAGE
        self.fields = fields
        self.details = details

    def envelope(self) -> dict[str, Any]:
        """The response body shape shared by every endpoint (§5.3)."""
        error: dict[str, Any] = {"code": self.code, "message": self.message}

        if self.fields:
            error["fields"] = self.fields

        return {"error": error}


class ValidationError(AppError):
    code = "VALIDATION_ERROR"
    status = 400


class UnauthorizedError(AppError):
    code = "UNAUTHORIZED"
    status = 401


class InvalidCredentialsError(AppError):
    """Wrong password and unknown email answer identically — on purpose (§5.4)."""

    code = "INVALID_CREDENTIALS"
    status = 401

    def __init__(self, message: str = "Невірна пошта або пароль") -> None:
        super().__init__(message)


class ForbiddenError(AppError):
    code = "FORBIDDEN"
    status = 403


class NotFoundError(AppError):
    code = "NOT_FOUND"
    status = 404


class SlugConflictError(AppError):
    code = "SLUG_CONFLICT"
    status = 409

    @classmethod
    def for_slug(cls, slug: str) -> "SlugConflictError":
        return cls(
            f'Адреса "{slug}" уже зайнята іншою категорією',
            fields={"slug": "Така адреса вже є"},
        )


class CategoryNotEmptyError(AppError):
    """The frontend adds the category name and the count; the code is enough here."""

    code = "CATEGORY_NOT_EMPTY"
    status = 409

    def __init__(
        self,
        message: str = "У категорії ще є позиції. Перенесіть або видаліть їх спочатку",
    ) -> None:
        super().__init__(message)


class FileTooLargeError(AppError):
    code = "FILE_TOO_LARGE"
    status = 413

    @classmethod
    def for_size(cls, size_bytes: int, limit_mb: int) -> "FileTooLargeError":
        """Same wording as the frontend's local check: the owner sees one message."""
        megabytes = size_bytes / 1024 / 1024
        return cls(f"Файл {megabytes:.1f} МБ. Максимум — {limit_mb} МБ")


class UnsupportedFileError(AppError):
    code = "UNSUPPORTED_FILE"
    status = 415

    def __init__(
        self,
        message: str = "Формат не підходить. Потрібен JPEG, PNG, WebP або HEIC",
        *,
        details: Any | None = None,
    ) -> None:
        super().__init__(message, details=details)


class RateLimitError(AppError):
    code = "RATE_LIMITED"
    status = 429

    def __init__(self, message: str = "Забагато спроб входу. Спробуйте за 10 хвилин") -> None:
        super().__init__(message)


class StorageError(AppError):
    code = "STORAGE_ERROR"
    status = 500

    def __init__(
        self,
        message: str = "Не вдалося зберегти фото. Спробуйте ще раз",
        *,
        details: Any | None = None,
    ) -> None:
        super().__init__(message, details=details)


class DatabaseError(AppError):
    code = "DATABASE_ERROR"
    status = 500

    def __init__(
        self,
        message: str = "База даних не відповідає. Спробуйте за хвилину",
        *,
        details: Any | None = None,
    ) -> None:
        super().__init__(message, details=details)


class InternalError(AppError):
    """Whatever nobody expected. The visitor learns nothing about it, the log everything."""

    code = "INTERNAL_ERROR"
    status = 500
