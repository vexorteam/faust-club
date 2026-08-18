"""Test environment: a configuration that always exists, and a real database.

Everything that does not need Postgres — settings, error envelopes, password
hashing — runs anywhere. Everything that checks a constraint needs the constraint
to exist, so `tests/db/` talks to a real server: `RESTRICT` and a unique index
are promises of Postgres, and SQLite would agree to break both.

`TEST_DATABASE_URL` points at that server; without one reachable those tests
skip loudly rather than pretend to pass.
"""

import asyncio
import os
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

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


TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", ENV["DATABASE_URL"])

TABLES = ("menu_item", "menu_category", "atmosphere_photo", "admin_user")

ROOT = Path(__file__).resolve().parent.parent

# Set by `_prepare_database` once the migrations have gone up, down and up
# again on a real Postgres. `test_migrations.py` reads it instead of running
# the cycle itself, which would drop the tables the other tests are using.
round_trip_ok = False


def _alembic_config(connection: Connection) -> Config:
    config = Config(str(ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(ROOT / "migrations"))
    # env.py takes this connection instead of opening its own.
    config.attributes["connection"] = connection

    return config


async def _prepare_database() -> None:
    """Builds the test schema out of the migrations, not out of `create_all`.

    Doing it through Alembic is the point: if a model drifts away from the
    migration, every database test starts failing instead of the drift being
    discovered on a deploy.
    """
    global round_trip_ok

    engine = create_async_engine(TEST_DATABASE_URL)

    try:
        async with engine.begin() as connection:
            await connection.run_sync(lambda sync: command.upgrade(_alembic_config(sync), "head"))
            await connection.run_sync(lambda sync: command.downgrade(_alembic_config(sync), "base"))
            await connection.run_sync(lambda sync: command.upgrade(_alembic_config(sync), "head"))

        round_trip_ok = True
    finally:
        await engine.dispose()


@pytest.fixture(scope="session")
def database() -> str:
    """The URL of a migrated test database, or a skip when Postgres is not around."""
    os.environ.update(ENV)
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL

    from faust_api.settings import get_settings

    get_settings.cache_clear()

    try:
        asyncio.run(_prepare_database())
    except OSError as error:
        pytest.skip(f"Postgres за {TEST_DATABASE_URL} недоступний: {error}")

    return TEST_DATABASE_URL


@pytest.fixture
async def engine(database: str) -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(database)

    yield engine

    async with engine.begin() as connection:
        await connection.execute(text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE"))

    await engine.dispose()


@pytest.fixture
async def session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as session:
        yield session
