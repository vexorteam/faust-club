"""What the schema promises regardless of what the code above it does.

These run against Postgres on purpose: a foreign key with `ON DELETE RESTRICT`
and a unique index are guarantees of the database, and the point of testing them
is that they hold even when a future handler forgets to check.
"""

import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import AdminUser, AtmospherePhoto, MenuCategory, MenuItem, MenuItemBadge


def category(slug: str = "signature", *, order: int = 1) -> MenuCategory:
    return MenuCategory(slug=slug, title="Авторські коктейлі", order=order)


def item(name: str = "Faust Sour", *, order: int = 1) -> MenuItem:
    return MenuItem(name=name, composition="бурбон, лимон", price=320, order=order)


async def test_a_category_with_positions_cannot_be_deleted(session: AsyncSession) -> None:
    """The owner gets a 409 for this; the database is the reason the 409 is honest."""
    row = category()
    row.items = [item()]
    session.add(row)
    await session.commit()

    await session.delete(row)

    with pytest.raises(IntegrityError):
        await session.commit()


async def test_an_empty_category_can_be_deleted(session: AsyncSession) -> None:
    row = category()
    session.add(row)
    await session.commit()

    await session.delete(row)
    await session.commit()

    assert await session.scalar(select(MenuCategory)) is None


async def test_two_categories_cannot_share_a_slug(session: AsyncSession) -> None:
    """The slug is the anchor of the public page, so it has to stay one address."""
    session.add(category())
    await session.commit()

    session.add(category(order=2))

    with pytest.raises(IntegrityError):
        await session.commit()


async def test_two_admins_cannot_share_an_email(session: AsyncSession) -> None:
    session.add(AdminUser(email="owner@faust.bar", password_hash="hash", name="Власник"))
    await session.commit()

    session.add(AdminUser(email="owner@faust.bar", password_hash="other", name="Хтось"))

    with pytest.raises(IntegrityError):
        await session.commit()


async def test_a_fresh_admin_starts_at_token_version_zero(session: AsyncSession) -> None:
    """Every issued token carries this number; logging out everywhere raises it (§5.4)."""
    admin = AdminUser(email="owner@faust.bar", password_hash="hash", name="Власник")
    session.add(admin)
    await session.commit()
    await session.refresh(admin)

    assert admin.token_version == 0
    assert admin.last_login_at is None
    assert admin.created_at is not None


async def test_positions_and_categories_are_visible_and_available_by_default(
    session: AsyncSession,
) -> None:
    row = category()
    row.items = [item()]
    session.add(row)
    await session.commit()
    await session.refresh(row, ["visible", "items"])

    assert row.visible is True
    assert row.items[0].available is True
    assert row.items[0].badge is None


async def test_a_badge_survives_the_round_trip(session: AsyncSession) -> None:
    """Stored as "hit", not as "HIT" — the frontend reads the lowercase form."""
    row = category()
    row.items = [item(), MenuItem(name="Мефісто", price=340, order=2, badge=MenuItemBadge.HIT)]
    session.add(row)
    await session.commit()

    stored = await session.scalar(select(MenuItem).where(MenuItem.name == "Мефісто"))

    assert stored is not None
    assert stored.badge is MenuItemBadge.HIT
    assert stored.badge.value == "hit"


async def test_a_position_needs_a_category(session: AsyncSession) -> None:
    session.add(MenuItem(category_id=uuid.uuid4(), name="Сирота", price=100, order=1))

    with pytest.raises(IntegrityError):
        await session.commit()


async def test_an_atmosphere_tile_without_a_photo_does_not_exist(session: AsyncSession) -> None:
    """A tile *is* its picture (§13.4) — the column says so, not just the handler."""
    session.add(AtmospherePhoto(label="Танцпол", image_alt="Танцпол під час сету", order=1))

    with pytest.raises(IntegrityError):
        await session.commit()


async def test_updated_at_moves_on_a_change_and_created_at_stays(session: AsyncSession) -> None:
    """Both stamps belong to the database — no handler sets them by hand."""
    row = category()
    session.add(row)
    await session.commit()
    await session.refresh(row)

    created, updated = row.created_at, row.updated_at

    row.title = "Коктейлі від бармена"
    await session.commit()
    await session.refresh(row)

    assert row.created_at == created
    assert row.updated_at > updated
