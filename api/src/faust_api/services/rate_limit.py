"""Five failed sign-ins per ten minutes per address (§3.5).

The counter lives in the process memory. Version 1.0 runs one API container,
and a limit that survives a restart is not worth a Redis — the attack this
stops is a script guessing passwords for hours, not one that waits out a
deploy.

It counts *failures*. A successful sign-in clears the bucket, so the owner
opening the admin panel five times in an evening never locks themselves out,
while five wrong guesses do exactly that.
"""

import logging
from collections import deque
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from ipaddress import ip_address

from fastapi import Request

from faust_api.settings import get_settings

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
WINDOW = timedelta(minutes=10)

UNKNOWN_CLIENT = "unknown"


@dataclass
class AttemptLimiter:
    """Sliding window per key. Keys are addresses; nothing else is stored."""

    max_attempts: int = MAX_ATTEMPTS
    window: timedelta = WINDOW
    _failures: dict[str, deque[datetime]] = field(default_factory=dict)

    def _recent(self, key: str) -> deque[datetime]:
        attempts = self._failures.get(key)

        if attempts is None:
            return deque()

        threshold = datetime.now(UTC) - self.window

        while attempts and attempts[0] < threshold:
            attempts.popleft()

        if not attempts:
            # Nothing left to remember: the bucket is not a leak waiting to grow.
            self._failures.pop(key, None)

        return attempts

    def blocked(self, key: str) -> bool:
        """Checked *before* the password is verified, so guess six is refused
        even when it happens to be right."""
        return len(self._recent(key)) >= self.max_attempts

    def record_failure(self, key: str) -> None:
        attempts = self._failures.setdefault(key, deque())
        attempts.append(datetime.now(UTC))

        if len(attempts) >= self.max_attempts:
            logger.warning("[auth] %s вичерпав спроби входу", key)

    def reset(self, key: str) -> None:
        self._failures.pop(key, None)

    def forget_all(self) -> None:
        """Tests only — the application never empties the whole window."""
        self._failures.clear()


login_limiter = AttemptLimiter()


def client_address(request: Request) -> str:
    """Who is knocking.

    The peer is normally the frontend, not the visitor: the login form is
    proxied through Next (§5.4), so every guest shares one connection. That is
    why `X-Forwarded-For` is read — but only when the peer itself is listed in
    `TRUSTED_PROXIES`. Believing the header from anyone would hand an attacker
    a fresh bucket per request, which is the same as having no limit at all.
    """
    peer = request.client.host if request.client else None

    if peer is None:
        return UNKNOWN_CLIENT

    if not _is_trusted(peer):
        return peer

    forwarded = request.headers.get("x-forwarded-for", "")
    # Left-most entry is the original client; the rest were added by proxies.
    original = forwarded.split(",")[0].strip()

    return original or peer


def _is_trusted(peer: str) -> bool:
    networks = get_settings().trusted_proxy_networks

    if not networks:
        return False

    try:
        address = ip_address(peer)
    except ValueError:
        return False

    return any(address in network for network in networks)
