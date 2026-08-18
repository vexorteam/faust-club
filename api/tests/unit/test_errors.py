from faust_api.errors import (
    AppError,
    CategoryNotEmptyError,
    FileTooLargeError,
    InvalidCredentialsError,
    SlugConflictError,
    StorageError,
    ValidationError,
)


def test_envelope_matches_the_contract() -> None:
    envelope = ValidationError("Перевірте заповнені поля", fields={"price": "Потрібне ціле число"}).envelope()

    assert envelope == {
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Перевірте заповнені поля",
            "fields": {"price": "Потрібне ціле число"},
        }
    }


def test_envelope_omits_empty_fields() -> None:
    assert "fields" not in CategoryNotEmptyError().envelope()["error"]


def test_statuses_follow_section_nine() -> None:
    assert (ValidationError().status, ValidationError().code) == (400, "VALIDATION_ERROR")
    assert (InvalidCredentialsError().status, InvalidCredentialsError().code) == (401, "INVALID_CREDENTIALS")
    assert (SlugConflictError().status, SlugConflictError().code) == (409, "SLUG_CONFLICT")
    assert (CategoryNotEmptyError().status, CategoryNotEmptyError().code) == (409, "CATEGORY_NOT_EMPTY")
    assert (FileTooLargeError().status, FileTooLargeError().code) == (413, "FILE_TOO_LARGE")


def test_file_too_large_says_the_size() -> None:
    """Same sentence as the frontend's own check: one wording for the owner."""
    error = FileTooLargeError.for_size(6_500_000, limit_mb=5)

    assert error.message == "Файл 6.2 МБ. Максимум — 5 МБ"


def test_slug_conflict_points_at_the_field() -> None:
    error = SlugConflictError.for_slug("signature")

    assert error.fields == {"slug": "Така адреса вже є"}
    assert "signature" in error.message


def test_details_never_reach_the_response() -> None:
    error = StorageError(details={"path": "/data/uploads/9f3a.webp"})

    assert "/data/uploads" not in str(error.envelope())


def test_credentials_error_says_nothing_about_which_half_was_wrong() -> None:
    assert InvalidCredentialsError().message == "Невірна пошта або пароль"


def test_base_error_falls_back_to_a_human_sentence() -> None:
    assert AppError().message.startswith("Щось пішло не так")
