"""Every failure leaves the API in the shape §5.3 promises.

The frontend reads `{ error: { code, message, fields? } }` and nothing else; a
response without it is treated as "the backend is down". These tests are the
guarantee that never happens by accident.
"""

from collections.abc import AsyncIterator

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel, Field
from sqlalchemy.exc import OperationalError

from faust_api.errors import CategoryNotEmptyError, SlugConflictError
from faust_api.handlers import install_handlers


class Payload(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    price: int = Field(ge=1)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app = FastAPI()
    install_handlers(app)

    @app.post("/items")
    async def create(payload: Payload) -> dict[str, str]:
        return {"name": payload.name}

    @app.delete("/categories/{slug}")
    async def remove(slug: str) -> None:
        raise CategoryNotEmptyError

    @app.post("/categories")
    async def conflict() -> None:
        raise SlugConflictError.for_slug("signature")

    @app.get("/boom")
    async def boom() -> None:
        raise RuntimeError("a bug nobody planned for")

    @app.get("/database-gone")
    async def database_gone() -> None:
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    transport = ASGITransport(app=app, raise_app_exceptions=False)

    async with AsyncClient(transport=transport, base_url="http://api") as client:
        yield client


async def test_validation_reports_every_broken_field(client: AsyncClient) -> None:
    response = await client.post("/items", json={"name": "F", "price": 0})

    assert response.status_code == 400
    body = response.json()["error"]
    assert body["code"] == "VALIDATION_ERROR"
    assert body["fields"] == {"name": "Занадто коротке значення", "price": "Значення замале"}


async def test_missing_field_is_named_in_ukrainian(client: AsyncClient) -> None:
    response = await client.post("/items", json={"price": 320})

    assert response.json()["error"]["fields"] == {"name": "Обов'язкове поле"}


async def test_our_own_error_keeps_its_code_and_status(client: AsyncClient) -> None:
    response = await client.delete("/categories/shots")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CATEGORY_NOT_EMPTY"


async def test_conflict_carries_the_field_hint(client: AsyncClient) -> None:
    response = await client.post("/categories")

    assert response.status_code == 409
    assert response.json()["error"]["fields"] == {"slug": "Така адреса вже є"}


async def test_unknown_route_still_answers_the_envelope(client: AsyncClient) -> None:
    response = await client.get("/menu")

    assert response.status_code == 404
    assert response.json() == {"error": {"code": "NOT_FOUND", "message": "Такого ендпоінта немає"}}


async def test_unexpected_failure_hides_the_details(client: AsyncClient) -> None:
    response = await client.get("/boom")

    assert response.status_code == 500
    body = response.json()["error"]
    assert body["code"] == "INTERNAL_ERROR"
    assert "nobody planned" not in body["message"]


async def test_a_silent_database_is_named_as_such(client: AsyncClient) -> None:
    """The visitor learns nothing new; the log and the frontend learn the cause."""
    response = await client.get("/database-gone")

    assert response.status_code == 500
    body = response.json()["error"]
    assert body["code"] == "DATABASE_ERROR"
    assert "connection refused" not in body["message"]
    assert "SELECT" not in body["message"]
