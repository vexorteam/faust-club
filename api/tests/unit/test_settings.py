import os

import pytest

from faust_api.settings import ConfigurationError, get_settings


def test_reads_the_environment() -> None:
    settings = get_settings()

    assert settings.jwt_ttl_days == 7
    assert settings.is_production is False


def test_media_prefix_drops_the_trailing_slash(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MEDIA_BASE_URL", "https://media.faust.bar/")
    get_settings.cache_clear()

    assert get_settings().media_prefix == "https://media.faust.bar"


def test_secrets_do_not_leak_into_text() -> None:
    """A logged settings object must not print the signing key."""
    assert "test-secret-not-a-real-one" not in repr(get_settings())


def test_missing_variable_stops_the_application(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("JWT_SECRET", raising=False)
    # The .env file of a developer's machine must not rescue the test.
    monkeypatch.setattr("faust_api.settings.Settings.model_config", {"extra": "ignore"})
    get_settings.cache_clear()

    with pytest.raises(ConfigurationError) as failure:
        get_settings()

    message = str(failure.value)

    assert "DATABASE_URL" in message
    assert "JWT_SECRET" in message
    assert "api/.env.example" in message


def test_production_hides_the_schema(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    get_settings.cache_clear()

    assert get_settings().is_production is True
    assert os.environ["ENVIRONMENT"] == "production"
