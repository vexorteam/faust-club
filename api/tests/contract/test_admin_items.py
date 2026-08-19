"""`/api/v1/admin/items` against §5.3.1.

The mirror is `faust/src/schemas/menu-item.ts`. Two things it depends on that
no type can express: the list arrives grouped by category with both levels
already sorted, and `order` inside a category stays 1..n whatever the owner
does to it — deletes, moves, or carrying a position over to another section.
"""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import MenuCategory, MenuItem, MenuItemBadge

ITEMS = "/api/v1/admin/items"


def category(slug: str, title: str, order: int, **extra: Any) -> MenuCategory:
    return MenuCategory(slug=slug, title=title, order=order, **extra)


def item(name: str, order: int, **extra: Any) -> MenuItem:
    defaults: dict[str, Any] = {"price": 320, "composition": "бурбон, лимон", "volume": "250 мл"}

    return MenuItem(name=name, order=order, **{**defaults, **extra})


async def persist(session: AsyncSession, *rows: MenuCategory) -> None:
    session.add_all(rows)
    await session.commit()
    session.expunge_all()


async def names_in_order(session: AsyncSession, category_id: uuid.UUID) -> list[tuple[str, int]]:
    rows = await session.scalars(
        select(MenuItem).where(MenuItem.category_id == category_id).order_by(MenuItem.order)
    )

    return [(row.name, row.order) for row in rows]


async def total_items(session: AsyncSession) -> int:
    return int(await session.scalar(select(func.count()).select_from(MenuItem)) or 0)


async def test_a_position_carries_every_field_of_the_contract(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
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

    group = (await admin_client.get(ITEMS)).json()["categories"][0]
    entry = group["items"][0]

    assert set(group) == {"id", "slug", "label", "visible", "items"}
    assert entry["categoryId"] == group["id"]
    assert entry["name"] == "Faust Sour"
    assert entry["description"] == "бурбон, лимон"
    assert entry["price"] == 320
    assert entry["volume"] == "250 мл"
    assert entry["image"].endswith("/menu/9f3a-card.webp")
    assert entry["imageAlt"] == "Коктейль Faust Sour у келиху купе"
    assert entry["badge"] == "hit"
    assert entry["available"] is True
    assert entry["order"] == 1


async def test_the_list_is_grouped_and_sorted_on_both_levels(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    shots = category("shots", "Шоти", 2)
    shots.items = [item("Текіла бум", 2), item("Б-52", 1)]

    signature = category("signature", "Авторські коктейлі", 1)
    signature.items = [item("Negroni", 2), item("Faust Sour", 1)]

    await persist(session, shots, signature)

    groups = (await admin_client.get(ITEMS)).json()["categories"]

    assert [group["slug"] for group in groups] == ["signature", "shots"]
    assert [entry["name"] for entry in groups[0]["items"]] == ["Faust Sour", "Negroni"]
    assert [entry["name"] for entry in groups[1]["items"]] == ["Б-52", "Текіла бум"]


async def test_a_hidden_category_still_shows_its_positions(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """Hidden means "not on the showcase", not "gone from the panel"."""
    wine = category("wine", "Вино й ігристе", 1, visible=False)
    wine.items = [item("Prosecco", 1)]
    await persist(session, wine)

    groups = (await admin_client.get(ITEMS)).json()["categories"]

    assert groups[0]["visible"] is False
    assert len(groups[0]["items"]) == 1


async def test_an_empty_category_is_still_a_group(admin_client: AsyncClient, session: AsyncSession) -> None:
    """Without it the panel could not offer "add the first position here"."""
    await persist(session, category("shots", "Шоти", 1))

    groups = (await admin_client.get(ITEMS)).json()["categories"]

    assert groups[0]["items"] == []


async def test_one_position_is_readable_for_the_edit_form(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
    stored = item("Faust Sour", 1)
    signature.items = [stored]
    await persist(session, signature)

    response = await admin_client.get(f"{ITEMS}/{stored.id}")

    assert response.status_code == 200
    assert response.json()["item"]["name"] == "Faust Sour"


@pytest.mark.parametrize("price", [0, -10, 320.5])
async def test_a_price_that_is_not_a_whole_positive_hryvnia_is_refused(
    admin_client: AsyncClient, session: AsyncSession, price: float
) -> None:
    """There are no kopecks behind a bar, and nothing there is free (§11)."""
    signature = category("signature", "Авторські коктейлі", 1)
    await persist(session, signature)

    response = await admin_client.post(
        ITEMS, json={"categoryId": str(signature.id), "name": "Faust Sour", "price": price}
    )

    assert response.status_code == 400
    assert "price" in response.json()["error"]["fields"]
    assert await total_items(session) == 0


async def test_a_new_position_lands_at_the_end_of_its_own_category(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
    signature.items = [item("Faust Sour", 1), item("Negroni", 2)]

    shots = category("shots", "Шоти", 2)
    await persist(session, signature, shots)

    body = (
        await admin_client.post(ITEMS, json={"categoryId": str(shots.id), "name": "Б-52", "price": 120})
    ).json()

    assert body["item"]["order"] == 1
    assert body["item"]["available"] is True
    assert body["item"]["badge"] is None


async def test_a_position_cannot_be_created_outside_a_category(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    unknown = "00000000-0000-4000-8000-000000000000"

    response = await admin_client.post(
        ITEMS, json={"categoryId": unknown, "name": "Faust Sour", "price": 320}
    )

    assert response.status_code == 404
    assert await total_items(session) == 0


async def test_changing_the_price_is_the_whole_patch(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """Scenario §6.3: the owner opens the row, types a number, saves."""
    signature = category("signature", "Авторські коктейлі", 1)
    stored = item("Faust Sour", 1)
    signature.items = [stored]
    await persist(session, signature)

    body = (await admin_client.patch(f"{ITEMS}/{stored.id}", json={"price": 555})).json()

    assert body["item"]["price"] == 555
    assert body["item"]["name"] == "Faust Sour"
    assert body["item"]["description"] == "бурбон, лимон"


async def test_taking_a_position_off_the_card_keeps_it_on_the_showcase(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """Scenario §6.5: `available: false` dims the card, it does not hide it (§5.3)."""
    signature = category("signature", "Авторські коктейлі", 1)
    stored = item("Faust Sour", 1)
    signature.items = [stored]
    await persist(session, signature)

    body = (await admin_client.patch(f"{ITEMS}/{stored.id}", json={"available": False})).json()

    assert body["item"]["available"] is False


async def test_the_photo_description_is_fixable_without_the_photo(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """The addition to §5.3.1 agreed in §13.4 — question 11 of the open list."""
    signature = category("signature", "Авторські коктейлі", 1)
    stored = item("Faust Sour", 1, image_key="menu/9f3a", image_alt="Кктейль")
    signature.items = [stored]
    await persist(session, signature)

    body = (
        await admin_client.patch(f"{ITEMS}/{stored.id}", json={"imageAlt": "Коктейль у келиху купе"})
    ).json()

    assert body["item"]["imageAlt"] == "Коктейль у келиху купе"
    assert body["item"]["image"].endswith("/menu/9f3a-card.webp")


async def test_a_patch_that_changes_nothing_is_refused(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
    stored = item("Faust Sour", 1)
    signature.items = [stored]
    await persist(session, signature)

    response = await admin_client.patch(f"{ITEMS}/{stored.id}", json={})

    assert response.status_code == 400
    assert response.json()["error"]["message"] == "Немає що змінювати"


async def test_moving_to_another_category_leaves_both_lists_contiguous(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """Changing `categoryId` is how a position changes section (§5.3.1).

    The hole it leaves behind closes, and it arrives at the end of its new
    list — otherwise the ↑↓ buttons would start disagreeing with what the owner
    sees on the page.
    """
    signature = category("signature", "Авторські коктейлі", 1)
    travelling = item("Negroni", 2)
    signature.items = [item("Faust Sour", 1), travelling, item("Old Fashioned", 3)]

    shots = category("shots", "Шоти", 2)
    shots.items = [item("Б-52", 1)]

    await persist(session, signature, shots)

    body = (await admin_client.patch(f"{ITEMS}/{travelling.id}", json={"categoryId": str(shots.id)})).json()

    assert body["item"]["categoryId"] == str(shots.id)
    assert body["item"]["order"] == 2
    assert await names_in_order(session, signature.id) == [("Faust Sour", 1), ("Old Fashioned", 2)]
    assert await names_in_order(session, shots.id) == [("Б-52", 1), ("Negroni", 2)]


async def test_moving_to_the_same_category_is_not_a_move(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """Resaving the form without touching the select must not send the position
    to the bottom of its own list."""
    signature = category("signature", "Авторські коктейлі", 1)
    first = item("Faust Sour", 1)
    signature.items = [first, item("Negroni", 2)]
    await persist(session, signature)

    body = (await admin_client.patch(f"{ITEMS}/{first.id}", json={"categoryId": str(signature.id)})).json()

    assert body["item"]["order"] == 1


async def test_deleting_a_position_closes_the_gap_it_leaves(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
    middle = item("Negroni", 2)
    signature.items = [item("Faust Sour", 1), middle, item("Old Fashioned", 3)]
    await persist(session, signature)

    response = await admin_client.delete(f"{ITEMS}/{middle.id}")

    assert response.status_code == 200
    assert await names_in_order(session, signature.id) == [("Faust Sour", 1), ("Old Fashioned", 2)]


async def test_a_move_stays_inside_its_own_category(admin_client: AsyncClient, session: AsyncSession) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
    alone = item("Faust Sour", 1)
    signature.items = [alone]

    shots = category("shots", "Шоти", 2)
    shots.items = [item("Б-52", 1), item("Текіла бум", 2)]

    await persist(session, signature, shots)

    response = await admin_client.post(f"{ITEMS}/{alone.id}/move", json={"direction": "down"})

    assert response.status_code == 200
    assert await names_in_order(session, signature.id) == [("Faust Sour", 1)]
    assert await names_in_order(session, shots.id) == [("Б-52", 1), ("Текіла бум", 2)]


async def test_moving_down_swaps_with_the_neighbour(admin_client: AsyncClient, session: AsyncSession) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
    first = item("Faust Sour", 1)
    signature.items = [first, item("Negroni", 2)]
    await persist(session, signature)

    await admin_client.post(f"{ITEMS}/{first.id}/move", json={"direction": "down"})

    assert await names_in_order(session, signature.id) == [("Negroni", 1), ("Faust Sour", 2)]


async def test_an_unknown_direction_is_refused(admin_client: AsyncClient, session: AsyncSession) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
    stored = item("Faust Sour", 1)
    signature.items = [stored]
    await persist(session, signature)

    response = await admin_client.post(f"{ITEMS}/{stored.id}/move", json={"direction": "вниз"})

    assert response.status_code == 400
    assert "direction" in response.json()["error"]["fields"]


async def test_a_write_without_a_session_never_reaches_the_database(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
    await persist(session, signature)

    response = await api_client.post(
        ITEMS, json={"categoryId": str(signature.id), "name": "Faust Sour", "price": 320}
    )

    assert response.status_code == 401
    assert await total_items(session) == 0


async def test_a_description_without_a_photo_is_refused(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """§5.3 pairs `imageAlt` with `image`. A description of a picture that is not
    there would be read aloud in place of nothing at all."""
    signature = category("signature", "Авторські коктейлі", 1)
    signature.items = [item("Мефісто", 1)]
    await persist(session, signature)

    target = signature.items[0].id
    answer = await admin_client.patch(f"{ITEMS}/{target}", json={"imageAlt": "опис без фото"})

    assert answer.status_code == 400
    assert "imageAlt" in answer.json()["error"]["fields"]

    stored = await session.get(MenuItem, target)
    assert stored is not None
    assert stored.image_alt is None


async def test_a_description_next_to_a_photo_is_saved(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """The point of the addition in §13.4: fixing a typo must not need the frame again."""
    signature = category("signature", "Авторські коктейлі", 1)
    signature.items = [item("Faust Sour", 1, image_key="menu/9f3a", image_alt="старий опис")]
    await persist(session, signature)

    target = signature.items[0].id
    answer = await admin_client.patch(f"{ITEMS}/{target}", json={"imageAlt": "Коктейль у келиху купе"})

    assert answer.status_code == 200
    assert answer.json()["item"]["imageAlt"] == "Коктейль у келиху купе"


async def test_filtering_by_a_category_that_is_gone_is_a_404(admin_client: AsyncClient) -> None:
    """An empty group would read as a section somebody emptied, not as one that
    no longer exists."""
    answer = await admin_client.get(ITEMS, params={"category": str(uuid.uuid4())})

    assert answer.status_code == 404
    assert answer.json()["error"]["code"] == "NOT_FOUND"
