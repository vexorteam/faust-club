"""The migration is the schema. These two tests keep that true.

A migration nobody can roll back is a one-way ticket, and a migration that has
quietly drifted from the models is a deploy that fails at the worst moment.
"""

from typing import Any

from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncEngine

from faust_api.models import Base
from tests import conftest

EXPECTED_TABLES = {"admin_user", "atmosphere_photo", "menu_category", "menu_item"}


async def test_the_migration_goes_up_down_and_up_again(engine: AsyncEngine) -> None:
    """`conftest` ran the whole cycle to build this database; here is the verdict."""
    assert conftest.round_trip_ok is True

    async with engine.connect() as connection:
        tables = await connection.run_sync(lambda sync: set(inspect(sync).get_table_names()))

    assert tables >= EXPECTED_TABLES
    assert "alembic_version" in tables


async def test_the_schema_matches_the_models(engine: AsyncEngine) -> None:
    """An empty diff means nobody has to guess which of the two is right."""

    def diff(sync_connection: Any) -> list[Any]:
        context = MigrationContext.configure(sync_connection, opts={"compare_type": True})

        return list(compare_metadata(context, Base.metadata))

    async with engine.connect() as connection:
        changes = await connection.run_sync(diff)

    assert changes == []


async def test_the_ordering_indexes_are_where_the_hot_queries_look(engine: AsyncEngine) -> None:
    """§5.2 names all three: the showcase reads the menu sorted, on every build."""

    def index_names(sync_connection: Any, table: str) -> set[str]:
        return {index["name"] or "" for index in inspect(sync_connection).get_indexes(table)}

    async with engine.connect() as connection:
        item_indexes = await connection.run_sync(index_names, "menu_item")
        category_indexes = await connection.run_sync(index_names, "menu_category")
        atmosphere_indexes = await connection.run_sync(index_names, "atmosphere_photo")

    assert "ix_item_category_order" in item_indexes
    assert "ix_category_order" in category_indexes
    assert "ix_atmosphere_order" in atmosphere_indexes
