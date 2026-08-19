"""`POST` and `DELETE /api/v1/admin/items/{id}/image` against §5.3.1.

The mirror is `faust/src/lib/admin.ts` (`uploadItemImage`, `deleteItemImage`)
and `itemImageResponseSchema`: this endpoint answers with the picture alone,
not with the whole position — the only place in the admin API that does.

The other thing worth stating: a menu position exists without a photo, so
taking the picture off leaves the drink on the card. An atmosphere tile is the
opposite, and `test_admin_atmosphere.py` holds that end.
"""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import MenuCategory, MenuItem
from faust_api.routers.admin import items as items_router
from faust_api.services.images import VARIANTS, file_path
from tests import photos

ITEMS = "/api/v1/admin/items"

ALT = "Коктейль Faust Sour у келиху купе"


@pytest.fixture
def asked(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Collects the tags the handlers ask the frontend to refresh."""
    tags: list[str] = []

    async def remember(tag: str) -> bool:
        tags.append(tag)
        return True

    monkeypatch.setattr(items_router, "request_revalidation", remember)

    return tags


def frame(data: bytes, name: str = "photo.jpg", content_type: str = "image/jpeg") -> dict[str, Any]:
    return {"file": (name, data, content_type)}


async def a_position(session: AsyncSession, **extra: Any) -> MenuItem:
    signature = MenuCategory(slug="signature", title="Авторські коктейлі", order=1)
    drink = MenuItem(name="Faust Sour", price=320, order=1, **extra)
    signature.items = [drink]

    session.add(signature)
    await session.commit()

    item_id = drink.id
    session.expunge_all()

    return await session.get_one(MenuItem, item_id)


async def reread(session: AsyncSession, item_id: uuid.UUID) -> MenuItem:
    session.expunge_all()

    return await session.get_one(MenuItem, item_id)


async def test_upload_answers_with_the_ready_url(admin_client: AsyncClient, session: AsyncSession) -> None:
    """The frontend gets an address; the storage key never leaves the process."""
    drink = await a_position(session)

    response = await admin_client.post(
        f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": ALT}
    )

    assert response.status_code == 200

    body = response.json()

    assert set(body) == {"image", "imageAlt"}
    assert body["image"].startswith("http://localhost:8000/media/menu/")
    assert body["image"].endswith("-card.webp")
    assert body["imageAlt"] == ALT

    stored = await reread(session, drink.id)

    assert stored.image_key is not None
    assert all(file_path(stored.image_key, variant).is_file() for variant in VARIANTS)


async def test_heic_from_an_iphone_is_accepted(admin_client: AsyncClient, session: AsyncSession) -> None:
    """Safari sends it with an empty MIME type — the magic bytes still decide."""
    drink = await a_position(session)

    response = await admin_client.post(
        f"{ITEMS}/{drink.id}/image",
        files=frame(photos.heic(), "IMG_4821.HEIC", ""),
        data={"alt": ALT},
    )

    assert response.status_code == 200


async def test_a_pdf_named_jpg_is_refused(admin_client: AsyncClient, session: AsyncSession) -> None:
    """415, and the position keeps whatever photo it had (§5.3.1)."""
    drink = await a_position(session, image_key="menu/old-0123456789abcdef")

    response = await admin_client.post(
        f"{ITEMS}/{drink.id}/image",
        files=frame(photos.pdf_pretending_to_be_a_photo()),
        data={"alt": ALT},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UNSUPPORTED_FILE"

    stored = await reread(session, drink.id)

    assert stored.image_key == "menu/old-0123456789abcdef"


async def test_an_oversized_frame_is_refused_with_its_size(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    drink = await a_position(session)

    response = await admin_client.post(
        f"{ITEMS}/{drink.id}/image", files=frame(photos.oversized()), data={"alt": ALT}
    )

    assert response.status_code == 413

    error = response.json()["error"]

    assert error["code"] == "FILE_TOO_LARGE"
    assert error["message"] == "Файл 6.0 МБ. Максимум — 5 МБ"


async def test_a_photo_without_a_description_is_refused(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """A picture nobody can see and nobody can read is worse than no picture."""
    drink = await a_position(session)

    response = await admin_client.post(
        f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": "фото"}
    )

    assert response.status_code == 400
    assert "alt" in response.json()["error"]["fields"]

    assert (await reread(session, drink.id)).image_key is None


async def test_replacing_a_frame_removes_the_old_files(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """All three variants of the previous shot, not just the one the card shows."""
    drink = await a_position(session)

    first = await admin_client.post(
        f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": ALT}
    )
    assert first.status_code == 200

    old_key = (await reread(session, drink.id)).image_key
    assert old_key is not None

    second = await admin_client.post(
        f"{ITEMS}/{drink.id}/image", files=frame(photos.png(), "photo.png", "image/png"), data={"alt": ALT}
    )
    assert second.status_code == 200

    new_key = (await reread(session, drink.id)).image_key

    assert new_key != old_key
    assert not any(file_path(old_key, variant).exists() for variant in VARIANTS)
    assert all(file_path(new_key or "", variant).is_file() for variant in VARIANTS)


async def test_removing_the_photo_leaves_the_position(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """The drink exists whether or not anybody has photographed it yet."""
    drink = await a_position(session)

    await admin_client.post(f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": ALT})
    key = (await reread(session, drink.id)).image_key
    assert key is not None

    response = await admin_client.delete(f"{ITEMS}/{drink.id}/image")

    assert response.status_code == 200

    stored = await reread(session, drink.id)

    assert stored.name == "Faust Sour"
    assert stored.image_key is None
    assert stored.image_alt is None
    assert not any(file_path(key, variant).exists() for variant in VARIANTS)


async def test_deleting_a_position_takes_its_files(admin_client: AsyncClient, session: AsyncSession) -> None:
    drink = await a_position(session)

    await admin_client.post(f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": ALT})
    key = (await reread(session, drink.id)).image_key
    assert key is not None

    assert (await admin_client.delete(f"{ITEMS}/{drink.id}")).status_code == 200

    session.expunge_all()

    assert await session.get(MenuItem, drink.id) is None
    assert not any(file_path(key, variant).exists() for variant in VARIANTS)


async def test_an_unknown_position_is_a_404(admin_client: AsyncClient, session: AsyncSession) -> None:
    await a_position(session)

    response = await admin_client.post(
        f"{ITEMS}/{uuid.uuid4()}/image", files=frame(photos.jpeg()), data={"alt": ALT}
    )

    assert response.status_code == 404


async def test_an_upload_without_a_session_never_reaches_the_volume(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """The frontend guards the form; this is the guard that actually counts (§3.5)."""
    drink = await a_position(session)

    response = await api_client.post(
        f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": ALT}
    )

    assert response.status_code == 401
    assert (await reread(session, drink.id)).image_key is None


async def test_the_showcase_is_asked_to_refresh(
    admin_client: AsyncClient, session: AsyncSession, asked: list[str]
) -> None:
    drink = await a_position(session)

    await admin_client.post(f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": ALT})
    await admin_client.delete(f"{ITEMS}/{drink.id}/image")

    assert asked == ["menu", "menu"]


async def test_the_public_menu_shows_the_new_photo(admin_client: AsyncClient, session: AsyncSession) -> None:
    """The whole point of the step, end to end: upload here, visible there."""
    drink = await a_position(session)

    await admin_client.post(f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": ALT})

    session.expunge_all()

    menu = await admin_client.get("/api/v1/menu")
    position = menu.json()["categories"][0]["items"][0]

    assert position["image"].endswith("-card.webp")
    assert position["imageAlt"] == ALT

    photo = await admin_client.get(position["image"].removeprefix("http://localhost:8000"))

    assert photo.status_code == 200
    assert photo.headers["content-type"] == "image/webp"
    assert photo.headers["cache-control"] == "public, max-age=31536000, immutable"


async def test_a_category_is_untouched_by_all_of_this(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """Sanity: the photo lives on the position, not on the section."""
    drink = await a_position(session)

    await admin_client.post(f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": ALT})

    session.expunge_all()
    categories = await session.scalars(select(MenuCategory))

    assert [row.slug for row in categories] == ["signature"]


async def test_a_refused_write_takes_the_new_files_with_it(
    admin_client: AsyncClient, session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The volume is not where failures go to be forgotten.

    Files are written before the row is touched on purpose, so a bad upload
    leaves the previous picture alone. The other half of that promise is this
    one: when the database is what refuses, nothing points at the three
    variants already on disk and nobody would ever come looking for them.
    """
    drink = await a_position(session, image_key="menu/old", image_alt="старий опис")

    async def refuse() -> None:
        raise RuntimeError("транзакція не пройшла")

    monkeypatch.setattr(type(session), "commit", lambda _self: refuse())

    response = await admin_client.post(
        f"{ITEMS}/{drink.id}/image", files=frame(photos.jpeg()), data={"alt": ALT}
    )

    assert response.status_code == 500

    monkeypatch.undo()
    stored = await reread(session, drink.id)

    assert stored.image_key == "menu/old"
    assert not list(file_path("menu/", "card").parent.glob(f"{drink.id.hex}-*"))
