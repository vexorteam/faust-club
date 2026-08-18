"""`/api/v1/admin/atmosphere` against §5.3.1.

The mirror is `faust/src/schemas/atmosphere.ts`. What this entity does
differently from the other two, and what the tests below hold it to: a tile
*is* its picture. It is born with a file in the same request, there is no way
to strip the photo and keep the tile, and deleting it takes the files along.

`label` and `imageAlt` are two different texts and both are required — one is
read by a visitor, the other by a screen reader.
"""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import AtmospherePhoto
from faust_api.routers.admin import atmosphere as atmosphere_router
from faust_api.services.images import VARIANTS, file_path
from tests import photos

ATMOSPHERE = "/api/v1/admin/atmosphere"

LABEL = "Танцпол"
ALT = "Танцпол Faust під час нічного сету"


@pytest.fixture
def asked(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Collects the tags the handlers ask the frontend to refresh."""
    tags: list[str] = []

    async def remember(tag: str) -> bool:
        tags.append(tag)
        return True

    monkeypatch.setattr(atmosphere_router, "request_revalidation", remember)

    return tags


def frame(data: bytes, name: str = "photo.jpg", content_type: str = "image/jpeg") -> dict[str, Any]:
    return {"file": (name, data, content_type)}


def tile(label: str, order: int, **extra: Any) -> AtmospherePhoto:
    defaults: dict[str, Any] = {
        "image_key": f"atmosphere/{uuid.uuid4().hex}-0123456789abcdef",
        "image_alt": f"{label} у клубі Faust уночі",
    }

    return AtmospherePhoto(label=label, order=order, **{**defaults, **extra})


async def persist(session: AsyncSession, *rows: AtmospherePhoto) -> None:
    session.add_all(rows)
    await session.commit()
    session.expunge_all()


async def grid(session: AsyncSession) -> list[tuple[str, int]]:
    session.expunge_all()
    rows = await session.scalars(select(AtmospherePhoto).order_by(AtmospherePhoto.order))

    return [(row.label, row.order) for row in rows]


# ── Reading ───────────────────────────────────────────────────────────────


async def test_a_tile_carries_every_field_of_the_contract(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    await persist(session, tile(LABEL, 1))

    response = await admin_client.get(ATMOSPHERE)

    assert response.status_code == 200

    photo = response.json()["photos"][0]

    assert set(photo) == {"id", "label", "image", "imageAlt", "order", "visible"}
    assert photo["label"] == LABEL
    assert photo["image"].startswith("http://localhost:8000/media/atmosphere/")
    assert photo["imageAlt"] == "Танцпол у клубі Faust уночі"
    assert photo["visible"] is True


async def test_hidden_tiles_stay_in_the_panel(admin_client: AsyncClient, session: AsyncSession) -> None:
    """The owner must see exactly what the database holds — hiding is not deleting."""
    await persist(session, tile("Бар", 1), tile("VIP-зона", 2, visible=False))

    response = await admin_client.get(ATMOSPHERE)

    assert [photo["label"] for photo in response.json()["photos"]] == ["Бар", "VIP-зона"]


async def test_tiles_arrive_sorted(admin_client: AsyncClient, session: AsyncSession) -> None:
    await persist(session, tile("Третя", 3), tile("Перша", 1), tile("Друга", 2))

    response = await admin_client.get(ATMOSPHERE)

    assert [photo["label"] for photo in response.json()["photos"]] == ["Перша", "Друга", "Третя"]


async def test_an_empty_grid_is_a_valid_answer(admin_client: AsyncClient) -> None:
    response = await admin_client.get(ATMOSPHERE)

    assert response.status_code == 200
    assert response.json() == {"photos": []}


# ── Creating ──────────────────────────────────────────────────────────────


async def test_a_tile_is_born_with_its_picture(
    admin_client: AsyncClient, session: AsyncSession, asked: list[str]
) -> None:
    response = await admin_client.post(
        ATMOSPHERE, files=frame(photos.jpeg()), data={"label": LABEL, "alt": ALT}
    )

    assert response.status_code == 200

    photo = response.json()["photo"]

    assert photo["label"] == LABEL
    assert photo["imageAlt"] == ALT
    assert photo["order"] == 1
    assert photo["visible"] is True

    session.expunge_all()
    stored = await session.get_one(AtmospherePhoto, uuid.UUID(photo["id"]))

    assert all(file_path(stored.image_key, variant).is_file() for variant in VARIANTS)
    assert asked == ["atmosphere"]


async def test_a_new_tile_goes_to_the_end_of_the_grid(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    await persist(session, tile("Бар", 1), tile("Танцпол", 2))

    await admin_client.post(ATMOSPHERE, files=frame(photos.jpeg()), data={"label": "VIP", "alt": ALT})

    assert await grid(session) == [("Бар", 1), ("Танцпол", 2), ("VIP", 3)]


async def test_a_tile_without_a_photo_is_refused(admin_client: AsyncClient, session: AsyncSession) -> None:
    """There is nothing to show on an empty tile, so there is no empty tile (§13.4)."""
    response = await admin_client.post(ATMOSPHERE, data={"label": LABEL, "alt": ALT})

    assert response.status_code == 400
    assert response.json()["error"]["fields"] == {"file": "Виберіть фото"}
    assert await grid(session) == []


async def test_a_pdf_named_jpg_never_becomes_a_tile(admin_client: AsyncClient, session: AsyncSession) -> None:
    response = await admin_client.post(
        ATMOSPHERE,
        files=frame(photos.pdf_pretending_to_be_a_photo()),
        data={"label": LABEL, "alt": ALT},
    )

    assert response.status_code == 415
    assert await grid(session) == []


async def test_an_oversized_frame_never_becomes_a_tile(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    response = await admin_client.post(
        ATMOSPHERE, files=frame(photos.oversized()), data={"label": LABEL, "alt": ALT}
    )

    assert response.status_code == 413
    assert response.json()["error"]["message"] == "Файл 6.0 МБ. Максимум — 5 МБ"
    assert await grid(session) == []


async def test_the_caption_and_the_description_are_both_required(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """Copying one into the other makes the section useless to anyone who cannot see it."""
    response = await admin_client.post(ATMOSPHERE, files=frame(photos.jpeg()), data={"label": LABEL})

    assert response.status_code == 400
    assert "alt" in response.json()["error"]["fields"]
    assert await grid(session) == []


# ── Editing ───────────────────────────────────────────────────────────────


async def test_the_caption_changes_without_reuploading_the_photo(
    admin_client: AsyncClient, session: AsyncSession, asked: list[str]
) -> None:
    await persist(session, tile("Бар", 1))
    photo_id = (await admin_client.get(ATMOSPHERE)).json()["photos"][0]["id"]

    response = await admin_client.patch(f"{ATMOSPHERE}/{photo_id}", json={"label": "Барна стійка"})

    assert response.status_code == 200

    photo = response.json()["photo"]

    assert photo["label"] == "Барна стійка"
    assert photo["imageAlt"] == "Бар у клубі Faust уночі"
    assert asked == ["atmosphere"]


async def test_a_tile_hides_without_losing_anything(admin_client: AsyncClient, session: AsyncSession) -> None:
    await persist(session, tile("VIP-зона", 1))
    photo_id = (await admin_client.get(ATMOSPHERE)).json()["photos"][0]["id"]

    response = await admin_client.patch(f"{ATMOSPHERE}/{photo_id}", json={"visible": False})

    assert response.json()["photo"]["visible"] is False
    assert (await admin_client.get("/api/v1/atmosphere")).json()["photos"] == []


async def test_an_empty_patch_is_refused(admin_client: AsyncClient, session: AsyncSession) -> None:
    await persist(session, tile("Бар", 1))
    photo_id = (await admin_client.get(ATMOSPHERE)).json()["photos"][0]["id"]

    response = await admin_client.patch(f"{ATMOSPHERE}/{photo_id}", json={})

    assert response.status_code == 400
    assert response.json()["error"]["message"] == "Немає що змінювати"


async def test_replacing_the_picture_removes_the_old_files(
    admin_client: AsyncClient, session: AsyncSession, asked: list[str]
) -> None:
    created = await admin_client.post(
        ATMOSPHERE, files=frame(photos.jpeg()), data={"label": LABEL, "alt": ALT}
    )
    photo_id = created.json()["photo"]["id"]

    session.expunge_all()
    old_key = (await session.get_one(AtmospherePhoto, uuid.UUID(photo_id))).image_key

    response = await admin_client.post(
        f"{ATMOSPHERE}/{photo_id}/image",
        files=frame(photos.png(), "photo.png", "image/png"),
        data={"alt": "Новий кадр танцполу вночі"},
    )

    assert response.status_code == 200
    assert response.json()["photo"]["imageAlt"] == "Новий кадр танцполу вночі"

    session.expunge_all()
    new_key = (await session.get_one(AtmospherePhoto, uuid.UUID(photo_id))).image_key

    assert new_key != old_key
    assert not any(file_path(old_key, variant).exists() for variant in VARIANTS)
    assert all(file_path(new_key, variant).is_file() for variant in VARIANTS)
    assert asked == ["atmosphere", "atmosphere"]


async def test_a_failed_replacement_leaves_the_tile_alone(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    """The tile keeps the picture it had — a refused upload is not a lost photo."""
    created = await admin_client.post(
        ATMOSPHERE, files=frame(photos.jpeg()), data={"label": LABEL, "alt": ALT}
    )
    photo_id = created.json()["photo"]["id"]

    session.expunge_all()
    key = (await session.get_one(AtmospherePhoto, uuid.UUID(photo_id))).image_key

    response = await admin_client.post(
        f"{ATMOSPHERE}/{photo_id}/image",
        files=frame(photos.pdf_pretending_to_be_a_photo()),
        data={"alt": ALT},
    )

    assert response.status_code == 415

    session.expunge_all()

    assert (await session.get_one(AtmospherePhoto, uuid.UUID(photo_id))).image_key == key
    assert all(file_path(key, variant).is_file() for variant in VARIANTS)


# ── Removing and reordering ───────────────────────────────────────────────


async def test_deleting_a_tile_takes_its_files_and_closes_the_gap(
    admin_client: AsyncClient, session: AsyncSession, asked: list[str]
) -> None:
    created = await admin_client.post(
        ATMOSPHERE, files=frame(photos.jpeg()), data={"label": LABEL, "alt": ALT}
    )
    photo_id = created.json()["photo"]["id"]

    await persist(session, tile("Бар", 2), tile("VIP-зона", 3))

    session.expunge_all()
    key = (await session.get_one(AtmospherePhoto, uuid.UUID(photo_id))).image_key

    response = await admin_client.delete(f"{ATMOSPHERE}/{photo_id}")

    assert response.status_code == 200
    assert await grid(session) == [("Бар", 1), ("VIP-зона", 2)]
    assert not any(file_path(key, variant).exists() for variant in VARIANTS)
    assert asked == ["atmosphere", "atmosphere"]


async def test_tiles_swap_places(admin_client: AsyncClient, session: AsyncSession) -> None:
    await persist(session, tile("Бар", 1), tile("Танцпол", 2))
    photos_list = (await admin_client.get(ATMOSPHERE)).json()["photos"]

    response = await admin_client.post(f"{ATMOSPHERE}/{photos_list[1]['id']}/move", json={"direction": "up"})

    assert response.status_code == 200
    assert await grid(session) == [("Танцпол", 1), ("Бар", 2)]


async def test_moving_past_the_edge_changes_nothing(
    admin_client: AsyncClient, session: AsyncSession, asked: list[str]
) -> None:
    """The owner pressed ↑ on the first tile. That is a 200, not a mistake (§5.3.1)."""
    await persist(session, tile("Бар", 1), tile("Танцпол", 2))
    photos_list = (await admin_client.get(ATMOSPHERE)).json()["photos"]

    response = await admin_client.post(f"{ATMOSPHERE}/{photos_list[0]['id']}/move", json={"direction": "up"})

    assert response.status_code == 200
    assert await grid(session) == [("Бар", 1), ("Танцпол", 2)]
    assert asked == []


async def test_an_unknown_tile_is_a_404(admin_client: AsyncClient) -> None:
    response = await admin_client.patch(f"{ATMOSPHERE}/{uuid.uuid4()}", json={"label": "Бар"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


async def test_nothing_here_works_without_a_session(api_client: AsyncClient, session: AsyncSession) -> None:
    """Anybody can talk to this API directly, so every request checks again (§3.5)."""
    response = await api_client.post(
        ATMOSPHERE, files=frame(photos.jpeg()), data={"label": LABEL, "alt": ALT}
    )

    assert response.status_code == 401
    assert await grid(session) == []
