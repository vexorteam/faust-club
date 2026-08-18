"""Every write tells the showcase it is out of date (§5.3).

Without this call a saved price sits in the database until the ISR timer
notices it an hour later, and the owner — who just watched the panel say
"Збережено" — reasonably concludes the site is broken.

The webhook runs after the response is sent, so a frontend that is redeploying
slows nothing down: the write already happened, and `request_revalidation`
never raises.
"""

from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import MenuCategory, MenuItem
from faust_api.routers.admin import categories as categories_router
from faust_api.routers.admin import items as items_router

CATEGORIES = "/api/v1/admin/categories"
ITEMS = "/api/v1/admin/items"


@pytest.fixture
def asked(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Collects the tags the handlers ask the frontend to refresh."""
    tags: list[str] = []

    async def remember(tag: str) -> bool:
        tags.append(tag)
        return True

    for module in (categories_router, items_router):
        monkeypatch.setattr(module, "request_revalidation", remember)

    return tags


async def stored(session: AsyncSession) -> tuple[MenuCategory, MenuItem]:
    category = MenuCategory(slug="signature", title="Авторські коктейлі", order=1)
    item = MenuItem(name="Faust Sour", price=320, order=1)
    category.items = [item]

    session.add(category)
    await session.commit()

    return category, item


async def test_a_saved_price_asks_the_showcase_to_refresh(
    admin_client: AsyncClient, session: AsyncSession, asked: list[str]
) -> None:
    _, item = await stored(session)

    await admin_client.patch(f"{ITEMS}/{item.id}", json={"price": 555})

    assert asked == ["menu"]


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("post", CATEGORIES, {"slug": "shots", "label": "Шоти"}),
        ("patch", f"{CATEGORIES}/{{category}}", {"label": "Фірмові"}),
        ("post", f"{CATEGORIES}/{{category}}/move", {"direction": "down"}),
        ("post", ITEMS, {"categoryId": "{category}", "name": "Negroni", "price": 280}),
        ("delete", f"{ITEMS}/{{item}}", None),
    ],
)
async def test_every_write_carries_the_menu_tag(
    admin_client: AsyncClient,
    session: AsyncSession,
    asked: list[str],
    method: str,
    path: str,
    body: dict[str, Any] | None,
) -> None:
    category, item = await stored(session)
    # A second category so the move has somewhere to go.
    session.add(MenuCategory(slug="classic", title="Класика", order=2))
    await session.commit()

    substitutions = {"category": str(category.id), "item": str(item.id)}
    filled = (
        None
        if body is None
        else {
            key: value.format(**substitutions) if isinstance(value, str) else value
            for key, value in body.items()
        }
    )

    response = await admin_client.request(method, path.format(**substitutions), json=filled)

    assert response.status_code == 200
    assert asked == ["menu"]


async def test_a_move_that_changed_nothing_does_not_wake_the_frontend(
    admin_client: AsyncClient, session: AsyncSession, asked: list[str]
) -> None:
    """Pressing ↑ on the first row is a 200 that rebuilt nothing — saying
    otherwise would throw away a warm cache for no reason."""
    category, _ = await stored(session)

    response = await admin_client.post(f"{CATEGORIES}/{category.id}/move", json={"direction": "up"})

    assert response.status_code == 200
    assert asked == []


async def test_a_refused_write_does_not_wake_the_frontend(
    admin_client: AsyncClient, session: AsyncSession, asked: list[str]
) -> None:
    category, _ = await stored(session)

    response = await admin_client.delete(f"{CATEGORIES}/{category.id}")

    assert response.status_code == 409
    assert asked == []
