"""The seed exists so a clean machine becomes a working site in one command.

Two things matter about it: the set it writes covers every state the showcase
can render (§13.1), and running it twice changes nothing — the owner's edits
must survive a redeploy that re-runs the command.
"""

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import AdminUser, AtmospherePhoto, MenuCategory, MenuItem
from faust_api.seed import seed
from faust_api.settings import ConfigurationError, get_settings

SEED_ENV = {
    "SEED_ADMIN_EMAIL": "Owner@Faust.Bar",
    "SEED_ADMIN_PASSWORD": "not-the-real-one",
}


@pytest.fixture(autouse=True)
def seed_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    for name, value in SEED_ENV.items():
        monkeypatch.setenv(name, value)

    get_settings.cache_clear()


async def test_it_fills_an_empty_database(session: AsyncSession) -> None:
    await seed(session)

    categories = await session.scalar(select(func.count()).select_from(MenuCategory))
    items = await session.scalar(select(func.count()).select_from(MenuItem))
    photos = await session.scalar(select(func.count()).select_from(AtmospherePhoto))

    assert (categories, items, photos) == (4, 7, 3)


async def test_the_set_covers_every_state_the_showcase_can_show(session: AsyncSession) -> None:
    """Hidden category, sold-out position, both badges, with and without a photo."""
    await seed(session)

    hidden = await session.scalar(
        select(func.count()).select_from(MenuCategory).where(MenuCategory.visible.is_(False))
    )
    sold_out = await session.scalar(
        select(func.count()).select_from(MenuItem).where(MenuItem.available.is_(False))
    )
    badges = await session.scalars(select(MenuItem.badge).where(MenuItem.badge.is_not(None)))

    with_photo = await session.scalar(
        select(func.count()).select_from(MenuItem).where(MenuItem.image_key.is_not(None))
    )
    without_photo = await session.scalar(
        select(func.count()).select_from(MenuItem).where(MenuItem.image_key.is_(None))
    )
    hidden_tiles = await session.scalar(
        select(func.count()).select_from(AtmospherePhoto).where(AtmospherePhoto.visible.is_(False))
    )

    assert hidden == 1
    assert sold_out == 1
    assert {badge.value for badge in badges if badge is not None} == {"new", "hit"}
    assert with_photo and without_photo
    assert hidden_tiles == 1


async def test_the_order_starts_at_one_inside_every_category(session: AsyncSession) -> None:
    await seed(session)

    orders = await session.scalars(select(MenuCategory.order).order_by(MenuCategory.order))

    assert list(orders) == [1, 2, 3, 4]

    signature = await session.scalar(select(MenuCategory).where(MenuCategory.slug == "signature"))
    assert signature is not None

    positions = await session.scalars(
        select(MenuItem.order).where(MenuItem.category_id == signature.id).order_by(MenuItem.order)
    )
    assert list(positions) == [1, 2, 3]


async def test_running_it_twice_changes_nothing(session: AsyncSession) -> None:
    await seed(session)

    edited = await session.scalar(select(MenuCategory).where(MenuCategory.slug == "signature"))
    assert edited is not None
    edited.title = "Коктейлі від бармена"
    await session.commit()

    await seed(session)

    categories = await session.scalar(select(func.count()).select_from(MenuCategory))
    items = await session.scalar(select(func.count()).select_from(MenuItem))
    admins = await session.scalar(select(func.count()).select_from(AdminUser))
    await session.refresh(edited)

    assert (categories, items, admins) == (4, 7, 1)
    assert edited.title == "Коктейлі від бармена"


async def test_the_admin_email_is_stored_in_lower_case(session: AsyncSession) -> None:
    """Login compares addresses, and the owner will not remember the capitals."""
    await seed(session)

    admin = await session.scalar(select(AdminUser))

    assert admin is not None
    assert admin.email == "owner@faust.bar"


async def test_the_password_is_hashed_and_never_stored_as_typed(session: AsyncSession) -> None:
    await seed(session)

    admin = await session.scalar(select(AdminUser))

    assert admin is not None
    assert admin.password_hash.startswith("$2b$12$")
    assert SEED_ENV["SEED_ADMIN_PASSWORD"] not in admin.password_hash


async def test_without_credentials_it_refuses_instead_of_inventing_an_account(
    session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("SEED_ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("SEED_ADMIN_PASSWORD", raising=False)
    monkeypatch.setattr("faust_api.settings.Settings.model_config", {"extra": "ignore"})
    get_settings.cache_clear()

    with pytest.raises(ConfigurationError) as failure:
        await seed(session)

    assert "SEED_ADMIN_EMAIL" in str(failure.value)
