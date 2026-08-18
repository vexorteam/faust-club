"""`/api/v1/admin/categories` against §5.3.1.

The mirror on the frontend is `faust/src/schemas/category.ts`, and it is strict
on purpose: unlike the public menu, where a broken row is dropped so the rest
of the card survives, the admin panel fails the whole request rather than hide
a category the owner is looking for. A rename that passes here and fails there
is a blank panel, which is what this file exists to prevent.
"""

from typing import Any

from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import MenuCategory, MenuItem

CATEGORIES = "/api/v1/admin/categories"


def category(slug: str, title: str, order: int, **extra: Any) -> MenuCategory:
    return MenuCategory(slug=slug, title=title, order=order, **extra)


async def persist(session: AsyncSession, *rows: MenuCategory) -> None:
    """Writes the rows and forgets them, so the endpoint has to re-read and re-sort."""
    session.add_all(rows)
    await session.commit()
    session.expunge_all()


async def slugs_in_order(session: AsyncSession) -> list[tuple[str, int]]:
    rows = await session.scalars(select(MenuCategory).order_by(MenuCategory.order))

    return [(row.slug, row.order) for row in rows]


async def total_categories(session: AsyncSession) -> int:
    return int(await session.scalar(select(func.count()).select_from(MenuCategory)) or 0)


async def test_the_list_carries_every_field_the_panel_reads(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1, note="подаються з 22:00")
    signature.items = [MenuItem(name="Faust Sour", price=320, order=1)]
    await persist(session, signature)

    body = (await admin_client.get(CATEGORIES)).json()

    assert body["categories"] == [
        {
            "id": body["categories"][0]["id"],
            "slug": "signature",
            "label": "Авторські коктейлі",
            "note": "подаються з 22:00",
            "order": 1,
            "visible": True,
            "itemsCount": 1,
        }
    ]


async def test_hidden_categories_stay_in_the_admin_list(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """The showcase filters them out; the owner has to see what is actually there."""
    await persist(
        session,
        category("signature", "Авторські коктейлі", 1),
        category("wine", "Вино й ігристе", 2, visible=False),
    )

    body = (await admin_client.get(CATEGORIES)).json()

    assert [(entry["slug"], entry["visible"]) for entry in body["categories"]] == [
        ("signature", True),
        ("wine", False),
    ]


async def test_the_list_arrives_sorted_no_matter_how_it_was_written(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    await persist(
        session,
        category("shots", "Шоти", 3),
        category("signature", "Авторські коктейлі", 1),
        category("classic", "Класика", 2),
    )

    body = (await admin_client.get(CATEGORIES)).json()

    assert [entry["slug"] for entry in body["categories"]] == ["signature", "classic", "shots"]


async def test_an_empty_category_counts_zero_positions(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    await persist(session, category("shots", "Шоти", 1))

    body = (await admin_client.get(CATEGORIES)).json()

    assert body["categories"][0]["itemsCount"] == 0


async def test_a_new_category_lands_at_the_end_of_the_list(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    await persist(session, category("signature", "Авторські коктейлі", 1))

    response = await admin_client.post(CATEGORIES, json={"slug": "shots", "label": "Шоти"})
    body = response.json()

    assert response.status_code == 200
    assert body["category"]["order"] == 2
    assert body["category"]["note"] is None
    assert body["category"]["visible"] is True
    assert body["category"]["itemsCount"] == 0


async def test_a_duplicate_slug_is_refused_and_the_field_is_named(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """The slug is the #anchor of /menu — two of them would break saved links."""
    await persist(session, category("signature", "Авторські коктейлі", 1))

    response = await admin_client.post(CATEGORIES, json={"slug": "signature", "label": "Ще одні"})
    body = response.json()

    assert response.status_code == 409
    assert body["error"]["code"] == "SLUG_CONFLICT"
    assert "slug" in body["error"]["fields"]
    assert await total_categories(session) == 1


async def test_a_slug_that_would_not_survive_a_url_is_refused(admin_client: AsyncClient) -> None:
    response = await admin_client.post(CATEGORIES, json={"slug": "Класика", "label": "Класика"})
    body = response.json()

    assert response.status_code == 400
    assert body["error"]["code"] == "VALIDATION_ERROR"
    # Not "Недопустимі символи": the answer says what a correct address is.
    assert body["error"]["fields"]["slug"] == "Адреса — лише малі латинські літери, цифри й дефіс"


async def test_renaming_touches_nothing_else(admin_client: AsyncClient, session: AsyncSession) -> None:
    """An inline rename in the panel sends one field, and means one field."""
    signature = category("signature", "Авторські коктейлі", 1, note="подаються з 22:00")
    await persist(session, signature)

    body = (await admin_client.patch(f"{CATEGORIES}/{signature.id}", json={"label": "Фірмові"})).json()

    assert body["category"]["label"] == "Фірмові"
    assert body["category"]["slug"] == "signature"
    assert body["category"]["note"] == "подаються з 22:00"


async def test_clearing_the_note_is_not_the_same_as_omitting_it(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1, note="подаються з 22:00")
    await persist(session, signature)

    body = (await admin_client.patch(f"{CATEGORIES}/{signature.id}", json={"note": None})).json()

    assert body["category"]["note"] is None


async def test_a_patch_that_changes_nothing_is_refused(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    signature = category("signature", "Авторські коктейлі", 1)
    await persist(session, signature)

    response = await admin_client.patch(f"{CATEGORIES}/{signature.id}", json={})
    body = response.json()

    assert response.status_code == 400
    assert body["error"]["message"] == "Немає що змінювати"


async def test_a_category_that_still_holds_positions_is_not_deleted(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """409, and the panel adds the name and the count before showing it (§9)."""
    shots = category("shots", "Шоти", 1)
    shots.items = [MenuItem(name="Б-52", price=120, order=1)]
    await persist(session, shots)

    response = await admin_client.delete(f"{CATEGORIES}/{shots.id}")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CATEGORY_NOT_EMPTY"
    assert await total_categories(session) == 1


async def test_deleting_a_category_closes_the_gap_it_leaves(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    middle = category("classic", "Класика", 2)
    await persist(
        session, category("signature", "Авторські коктейлі", 1), middle, category("shots", "Шоти", 3)
    )

    response = await admin_client.delete(f"{CATEGORIES}/{middle.id}")

    assert response.status_code == 200
    assert await slugs_in_order(session) == [("signature", 1), ("shots", 2)]


async def test_moving_up_at_the_top_of_the_list_is_still_a_success(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """The button is disabled in the panel, but the API must not treat a stray
    press as a failure — it is 200 and nothing moved (§5.3.1)."""
    first = category("signature", "Авторські коктейлі", 1)
    await persist(session, first, category("classic", "Класика", 2))

    response = await admin_client.post(f"{CATEGORIES}/{first.id}/move", json={"direction": "up"})

    assert response.status_code == 200
    assert await slugs_in_order(session) == [("signature", 1), ("classic", 2)]


async def test_moving_down_swaps_with_the_neighbour(admin_client: AsyncClient, session: AsyncSession) -> None:
    first = category("signature", "Авторські коктейлі", 1)
    await persist(session, first, category("classic", "Класика", 2))

    await admin_client.post(f"{CATEGORIES}/{first.id}/move", json={"direction": "down"})

    assert await slugs_in_order(session) == [("classic", 1), ("signature", 2)]


async def test_an_unknown_category_is_a_404_not_a_crash(admin_client: AsyncClient) -> None:
    unknown = "00000000-0000-4000-8000-000000000000"

    response = await admin_client.patch(f"{CATEGORIES}/{unknown}", json={"label": "Нова назва"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


async def test_a_write_without_a_session_never_reaches_the_database(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """The frontend guards this too — but anybody can call the API directly (§3.5)."""
    response = await api_client.post(CATEGORIES, json={"slug": "shots", "label": "Шоти"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
    assert await total_categories(session) == 0
