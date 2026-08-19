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


def test_a_forged_entry_in_front_of_the_real_one_is_not_believed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The edge proxy *appends* to whatever the browser sent, so the left-hand
    end of the chain belongs to the caller. Reading it would give an attacker a
    fresh bucket per request — five guesses each, forever."""
    trusting(monkeypatch, "10.0.0.0/8")

    forged = request_from("10.0.0.5", x_forwarded_for="9.9.9.9, 203.0.113.7, 10.0.0.5")

    assert client_address(forged) == "203.0.113.7"


def test_a_chain_of_nonsense_does_not_mint_a_bucket(monkeypatch: pytest.MonkeyPatch) -> None:
    """Only our own proxies write into this header, and they write addresses."""
    trusting(monkeypatch, "10.0.0.0/8")

    junk = request_from("10.0.0.5", x_forwarded_for="not-an-address, 10.0.0.5")

    assert client_address(junk) == "10.0.0.5"


def test_the_limit_survives_a_forged_header(monkeypatch: pytest.MonkeyPatch) -> None:
    """The whole point, end to end: the same visitor behind a proxy runs out of
    attempts no matter what they put in front of their own address."""
    trusting(monkeypatch, "10.0.0.0/8")
    limiter = AttemptLimiter()

    for guess in range(MAX_ATTEMPTS):
        caller = client_address(
            request_from("10.0.0.5", x_forwarded_for=f"9.9.9.{guess}, 203.0.113.7, 10.0.0.5")
        )
        limiter.record_failure(caller)

    assert limiter.blocked("203.0.113.7") is True


def test_buckets_of_addresses_that_went_quiet_are_swept(monkeypatch: pytest.MonkeyPatch) -> None:
    """`_recent` only cleans the key it is asked about, so without a sweep a
    burst from many addresses would leave an entry behind for each of them."""
    limiter = AttemptLimiter()

    for host in range(2000):
        limiter.record_failure(f"203.0.113.{host // 250}.{host % 250}")

    monkeypatch.setattr(limiter, "window", timedelta(seconds=0))
    limiter.record_failure("198.51.100.1")

    assert len(limiter._failures) == 1
