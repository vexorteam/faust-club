"""/health is what a container healthcheck reads, so its status code matters."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from faust_api import __version__


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    from faust_api.main import create_app

    transport = ASGITransport(app=create_app())

    async with AsyncClient(transport=transport, base_url="http://api") as client:
        yield client


async def test_reports_ok_when_the_database_answers(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def ready() -> bool:
        return True

    monkeypatch.setattr("faust_api.routers.health.database_ready", ready)

    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": __version__}


async def test_reports_down_when_the_database_is_unreachable(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def unreachable() -> bool:
        return False

    monkeypatch.setattr("faust_api.routers.health.database_ready", unreachable)

    response = await client.get("/health")

    assert response.status_code == 503
    assert response.json()["status"] == "down"
