"""Test environment: a configuration that exists, and no database anywhere.

Step Б1 has no models yet, so nothing here touches Postgres — the health probe
is the only thing that would, and the tests that care about it replace it.
"""

import os
from collections.abc import Iterator

import pytest

ENV = {
    "ENVIRONMENT": "development",
    "DATABASE_URL": "postgresql+asyncpg://faust:faust@localhost:5432/faust_test",
    "JWT_SECRET": "test-secret-not-a-real-one",
    "MEDIA_BASE_URL": "http://localhost:8000/media",
    "UPLOAD_DIR": "./uploads",
}


@pytest.fixture(autouse=True)
def environment() -> Iterator[None]:
    previous = {name: os.environ.get(name) for name in ENV}
    os.environ.update(ENV)

    from faust_api.settings import get_settings

    get_settings.cache_clear()

    yield

    for name, value in previous.items():
        if value is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = value

    get_settings.cache_clear()
