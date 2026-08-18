"""`/media/…` — the volume, handed out by the API itself (§13.4).

There is no separate nginx for photos in version 1.0, so this router is what
the browser talks to. Two things it must get right: the cache header, because
the whole naming scheme exists to make it safe, and the refusal of anything
that is not a name the server itself generated.
"""

import uuid

from httpx import AsyncClient

from faust_api.services.images import MENU_FOLDER, store_photo
from tests import photos


async def test_a_stored_photo_is_served_as_immutable(api_client: AsyncClient) -> None:
    """A year in the cache, never re-checked: a changed photo is a changed name."""
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.jpeg())

    response = await api_client.get(f"/media/{key}-card.webp")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/webp"
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"
    assert response.content.startswith(b"RIFF")


async def test_every_variant_is_reachable(api_client: AsyncClient) -> None:
    """The showcase asks for `card`; `thumb` and `full` exist for whoever needs them."""
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.jpeg())

    for variant in ("thumb", "card", "full"):
        assert (await api_client.get(f"/media/{key}-{variant}.webp")).status_code == 200


async def test_headers_alone_are_answered_too(api_client: AsyncClient) -> None:
    """A browser revalidating a cached photo asks with HEAD, not GET."""
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.jpeg())

    response = await api_client.head(f"/media/{key}-card.webp")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"


async def test_unknown_photo_answers_in_the_envelope(api_client: AsyncClient) -> None:
    """A missing file is a 404 the frontend can read, not a bare starlette body."""
    response = await api_client.get("/media/menu/0123456789abcdef-0123456789abcdef-card.webp")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


async def test_a_path_outside_the_volume_is_refused(api_client: AsyncClient) -> None:
    response = await api_client.get("/media/../../etc/passwd")

    assert response.status_code == 404
    assert "root:" not in response.text
