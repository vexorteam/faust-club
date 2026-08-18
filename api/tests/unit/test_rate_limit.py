"""Five failed sign-ins per ten minutes per address (§3.5).

Two separate promises live here: the counting itself, and deciding *whose*
attempt it was. The second one matters more than it looks — the login form is
proxied through Next, so the peer the API sees is the same for every visitor.
"""

from datetime import timedelta

import pytest
from fastapi import Request

from faust_api.services.rate_limit import MAX_ATTEMPTS, AttemptLimiter, client_address
from faust_api.settings import get_settings


def trusting(monkeypatch: pytest.MonkeyPatch, networks: str) -> None:
    """Through the environment, the way the compose file configures it."""
    monkeypatch.setenv("TRUSTED_PROXIES", networks)
    get_settings.cache_clear()


def request_from(peer: str | None, **headers: str) -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/auth/login",
        "headers": [(name.replace("_", "-").encode(), value.encode()) for name, value in headers.items()],
        "client": (peer, 51234) if peer else None,
    }

    return Request(scope)


def test_the_window_opens_after_the_agreed_number_of_failures() -> None:
    limiter = AttemptLimiter()

    for _ in range(MAX_ATTEMPTS - 1):
        limiter.record_failure("10.0.0.1")
        assert limiter.blocked("10.0.0.1") is False

    limiter.record_failure("10.0.0.1")

    assert limiter.blocked("10.0.0.1") is True


def test_a_successful_sign_in_clears_the_bucket() -> None:
    """The owner opening the panel all evening must not lock themselves out."""
    limiter = AttemptLimiter()

    for _ in range(MAX_ATTEMPTS):
        limiter.record_failure("10.0.0.1")

    limiter.reset("10.0.0.1")

    assert limiter.blocked("10.0.0.1") is False


def test_one_address_locked_does_not_lock_another() -> None:
    limiter = AttemptLimiter()

    for _ in range(MAX_ATTEMPTS):
        limiter.record_failure("10.0.0.1")

    assert limiter.blocked("10.0.0.2") is False


def test_attempts_older_than_the_window_stop_counting() -> None:
    """A window of zero length: every attempt is already in the past."""
    limiter = AttemptLimiter(window=timedelta(0))

    for _ in range(MAX_ATTEMPTS * 2):
        limiter.record_failure("10.0.0.1")

    assert limiter.blocked("10.0.0.1") is False


def test_a_forwarded_header_from_a_stranger_is_ignored() -> None:
    """Otherwise every request could claim a fresh bucket, and the limit is gone."""
    assert client_address(request_from("203.0.113.7", x_forwarded_for="1.2.3.4")) == "203.0.113.7"


def test_a_forwarded_header_from_the_frontend_is_believed(monkeypatch: pytest.MonkeyPatch) -> None:
    trusting(monkeypatch, "10.0.0.0/8")

    assert client_address(request_from("10.0.0.5", x_forwarded_for="203.0.113.7, 10.0.0.5")) == "203.0.113.7"


def test_a_trusted_proxy_without_the_header_still_counts_as_itself(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    trusting(monkeypatch, "10.0.0.0/8")

    assert client_address(request_from("10.0.0.5")) == "10.0.0.5"


def test_a_request_without_a_peer_lands_in_one_shared_bucket() -> None:
    """Nameless callers share a window rather than each getting a free one."""
    assert client_address(request_from(None)) == "unknown"
