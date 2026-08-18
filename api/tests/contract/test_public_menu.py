"""`GET /api/v1/menu` against §5.3, field by field.

These expectations are the same ones `faust/src/schemas/menu.ts` enforces on
the other side. The frontend drops anything that does not match and shows an
empty bar card instead, so a rename that passes here and fails there is
invisible until the showcase goes blank — which is exactly what this file is
here to prevent.
"""

from typing import Any

from httpx import AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from faust_api.models import MenuCategory, MenuItem, MenuItemBadge

MENU = "/api/v1/menu"


def category(slug: str, title: str, order: int, **extra: Any) -> MenuCategory:
    return MenuCategory(slug=slug, title=title, order=order, **extra)


def item(name: str, order: int, **extra: Any) -> MenuItem:
    defaults: dict[str, Any] = {"price": 320, "composition": "бурбон, лимон", "volume": "250 мл"}

    return MenuItem(name=name, order=order, **{**defaults, **extra})


async def persist(session: AsyncSession, *rows: MenuCategory) -> None:
    """Writes the rows and forgets them.

    Without the `expunge_all` the endpoint would be handed back the very
    objects the test just built, in the order the test built them — and the
    ordering the contract promises would go untested. In production every
    request gets a fresh session, so this is what actually happens there.
    """
    session.add_all(rows)
    await session.commit()
    session.expunge_all()


async def test_item_carries_every_field_of_the_contract(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1, note="подаються з 22:00")
    signature.items = [
        item(
            "Faust Sour",
            1,
            badge=MenuItemBadge.HIT,
            image_key="menu/9f3a",
            image_alt="Коктейль Faust Sour у келиху купе",
        )
    ]
    await persist(session, signature)

    body = (await api_client.get(MENU)).json()

    assert body == {
        "categories": [
            {
                "slug": "signature",
                "label": "Авторські коктейлі",
                "note": "подаються з 22:00",
                "items": [
                    {
                        "id": str(signature.items[0].id),
                        "name": "Faust Sour",
                        "description": "бурбон, лимон",
                        "price": 320,
                        "volume": "250 мл",
                        "image": "http://localhost:8000/media/menu/9f3a-card.webp",
                        "imageAlt": "Коктейль Faust Sour у келиху купе",
                        "badge": "hit",
                        "available": True,
                    }
                ],
            }
        ]
    }


async def test_hidden_category_never_reaches_the_showcase(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    shown = category("signature", "Авторські коктейлі", 1)
    shown.items = [item("Faust Sour", 1)]

    hidden = category("wine", "Вино й ігристе", 2, visible=False)
    hidden.items = [item("Ігристе брют", 1)]

    await persist(session, shown, hidden)

    body = (await api_client.get(MENU)).json()

    assert [entry["slug"] for entry in body["categories"]] == ["signature"]


async def test_both_levels_arrive_sorted_by_order(api_client: AsyncClient, session: AsyncSession) -> None:
    """The frontend renders the arrays as they come — sorting is the API's job."""
    second = category("classic", "Класика", 2)
    second.items = [item("Олд фешн", 2), item("Негроні", 1)]

    first = category("signature", "Авторські коктейлі", 1)
    first.items = [item("Мефісто", 2), item("Faust Sour", 1)]

    # Inserted back to front on purpose: the answer must not depend on this.
    await persist(session, second, first)

    body = (await api_client.get(MENU)).json()

    assert [entry["slug"] for entry in body["categories"]] == ["signature", "classic"]
    assert [entry["name"] for entry in body["categories"][0]["items"]] == ["Faust Sour", "Мефісто"]
    assert [entry["name"] for entry in body["categories"][1]["items"]] == ["Негроні", "Олд фешн"]


async def test_unavailable_position_stays_on_the_card(api_client: AsyncClient, session: AsyncSession) -> None:
    """`available: false` dims the card, it does not remove it (§5.3)."""
    shots = category("shots", "Шоти", 1)
    shots.items = [item("Нічна зміна", 1, available=False)]

    await persist(session, shots)

    body = (await api_client.get(MENU)).json()
    position = body["categories"][0]["items"][0]

    assert position["available"] is False
    assert position["price"] == 320


async def test_position_without_a_photo_reports_null(api_client: AsyncClient, session: AsyncSession) -> None:
    classic = category("classic", "Класика", 1)
    classic.items = [item("Олд фешн", 1, volume=None, composition=None)]

    await persist(session, classic)

    position = (await api_client.get(MENU)).json()["categories"][0]["items"][0]

    assert position["image"] is None
    assert position["imageAlt"] is None
    assert position["volume"] is None
    assert position["badge"] is None


async def test_empty_menu_is_a_valid_answer(api_client: AsyncClient) -> None:
    """An empty list means an empty state on the page, not an error."""
    response = await api_client.get(MENU)

    assert response.status_code == 200
    assert response.json() == {"categories": []}


async def test_empty_category_keeps_its_place(api_client: AsyncClient, session: AsyncSession) -> None:
    await persist(session, category("snacks", "Снеки", 1))

    body = (await api_client.get(MENU)).json()

    assert body["categories"][0]["items"] == []
    assert body["categories"][0]["note"] is None


async def test_menu_costs_the_same_two_queries_at_any_size(
    api_client: AsyncClient, session: AsyncSession, engine: AsyncEngine
) -> None:
    """This is the hottest endpoint of the project — N+1 here is N+1 on every build."""
    rows = []

    for index in range(1, 6):
        row = category(f"category-{index}", f"Категорія {index}", index)
        row.items = [item(f"Позиція {index}", 1)]
        rows.append(row)

    await persist(session, *rows)

    statements: list[str] = []

    def record(conn: Any, cursor: Any, statement: str, *rest: Any) -> None:
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)

    event.listen(engine.sync_engine, "before_cursor_execute", record)

    try:
        body = (await api_client.get(MENU)).json()
    finally:
        event.remove(engine.sync_engine, "before_cursor_execute", record)

    assert len(body["categories"]) == 5
    # One select for the categories, one more for all of their items together.
    assert len(statements) == 2, statements
