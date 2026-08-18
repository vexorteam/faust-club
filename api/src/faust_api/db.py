"""Database access: one engine, one session factory, one health probe.

The engine is created lazily so that importing the application — as the tests
and `--help` do — costs no connection. Models and migrations arrive in step Б2;
this module only opens the door.
"""

import logging
from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from faust_api.settings import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def get_engine() -> AsyncEngine:
    settings = get_settings()

    return create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        echo=False,
    )


@lru_cache
def get_session_factory() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one session per request, always closed."""
    factory = get_session_factory()

    async with factory() as session:
        yield session


async def database_ready() -> bool:
    """`SELECT 1`. Used by /health, which is what the container healthcheck reads."""
    try:
        async with get_engine().connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception:
        logger.exception("[db] the database did not answer")
        return False

    return True
