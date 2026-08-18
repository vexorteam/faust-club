"""The webhook that tells the showcase its cache is stale.

The one rule worth testing: it never turns a saved change into an error. The
write has already happened by the time this runs, so an unreachable frontend
costs a line in the log and nothing else.
"""

from collections.abc import Callable
from typing import Any

import httpx
import pytest

from faust_api.services.revalidate import request_revalidation
from faust_api.settings import get_settings


@pytest.fixture(autouse=True)
def configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REVALIDATE_URL", "http://frontend/api/revalidate")
    monkeypatch.setenv("REVALIDATE_SECRET", "shared-with-the-frontend")
    get_settings.cache_clear()


Answer = Callable[[httpx.Request], httpx.Response]


def _intercept(monkeypatch: pytest.MonkeyPatch, answer: Answer) -> list[httpx.Request]:
    """Replaces the one method every httpx call funnels through, and records it."""
    sent: list[httpx.Request] = []

    async def send(self: httpx.AsyncClient, request: httpx.Request, **kwargs: Any) -> httpx.Response:
        sent.append(request)
        return answer(request)

    monkeypatch.setattr(httpx.AsyncClient, "send", send)

    return sent


async def test_knocks_on_the_frontend_with_the_tag_and_the_secret(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sent = _intercept(monkeypatch, lambda request: httpx.Response(200, json={"revalidated": True}))

    assert await request_revalidation("menu") is True

    assert len(sent) == 1
    assert sent[0].method == "POST"
    assert str(sent[0].url) == "http://frontend/api/revalidate?tag=menu"
    assert sent[0].headers["authorization"] == "Bearer shared-with-the-frontend"


async def test_the_two_tags_are_separate(monkeypatch: pytest.MonkeyPatch) -> None:
    """Editing a photo must not throw away the cached menu, and the other way round."""
    sent = _intercept(monkeypatch, lambda request: httpx.Response(200))

    await request_revalidation("atmosphere")

    assert sent[0].url.params["tag"] == "atmosphere"


async def test_unreachable_frontend_does_not_raise(monkeypatch: pytest.MonkeyPatch) -> None:
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    _intercept(monkeypatch, refuse)

    assert await request_revalidation("menu") is False


async def test_rejected_call_does_not_raise(monkeypatch: pytest.MonkeyPatch) -> None:
    """A wrong secret is a misconfiguration to fix, not a reason to lose the write."""
    _intercept(monkeypatch, lambda request: httpx.Response(401, json={"error": "nope"}))

    assert await request_revalidation("menu") is False


async def test_without_configuration_nothing_is_sent(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("REVALIDATE_URL", raising=False)
    monkeypatch.delenv("REVALIDATE_SECRET", raising=False)
    # The .env file of a developer's machine must not rescue the test.
    monkeypatch.setattr("faust_api.settings.Settings.model_config", {"extra": "ignore"})
    get_settings.cache_clear()

    sent = _intercept(monkeypatch, lambda request: httpx.Response(200))

    assert await request_revalidation("menu") is False
    assert sent == []
