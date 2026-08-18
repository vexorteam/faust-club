"""`GET /api/v1/atmosphere` against §5.3.

The mirror on the frontend is `publicAtmospherePhotoSchema`. It asks for four
fields and nothing else — a tile that arrives without a valid `image` is
dropped there, and enough of them dropped means the section disappears from the
home page.
"""

from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import AtmospherePhoto

ATMOSPHERE = "/api/v1/atmosphere"


def photo(label: str, order: int, **extra: Any) -> AtmospherePhoto:
    defaults: dict[str, Any] = {
        "image_key": f"atmosphere/{order}",
        "image_alt": f"{label} клубу Faust уночі",
    }

    return AtmospherePhoto(label=label, order=order, **{**defaults, **extra})


async def persist(session: AsyncSession, *rows: AtmospherePhoto) -> None:
    """Writes the tiles and forgets them, so the endpoint reads the database."""
    session.add_all(rows)
    await session.commit()
    session.expunge_all()


async def test_tile_carries_exactly_the_four_public_fields(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """`order` and `visible` are the admin panel's business and stay out of here."""
    tile = photo("Танцпол", 1)
    await persist(session, tile)

    body = (await api_client.get(ATMOSPHERE)).json()

    assert body == {
        "photos": [
            {
                "id": str(tile.id),
                "label": "Танцпол",
                "image": "http://localhost:8000/media/atmosphere/1-card.webp",
                "imageAlt": "Танцпол клубу Faust уночі",
            }
        ]
    }


async def test_hidden_tile_never_reaches_the_home_page(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    await persist(session, photo("Бар", 1), photo("VIP-зона", 2, visible=False))

    body = (await api_client.get(ATMOSPHERE)).json()

    assert [entry["label"] for entry in body["photos"]] == ["Бар"]


async def test_tiles_arrive_sorted_by_order(api_client: AsyncClient, session: AsyncSession) -> None:
    await persist(session, photo("Бар", 3), photo("Танцпол", 1), photo("VIP-зона", 2))

    body = (await api_client.get(ATMOSPHERE)).json()

    assert [entry["label"] for entry in body["photos"]] == ["Танцпол", "VIP-зона", "Бар"]


async def test_no_photos_is_a_valid_answer(api_client: AsyncClient) -> None:
    """No photos means no section — the home page drops the block, not the site."""
    response = await api_client.get(ATMOSPHERE)

    assert response.status_code == 200
    assert response.json() == {"photos": []}
