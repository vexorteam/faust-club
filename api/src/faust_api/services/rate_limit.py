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
from ipaddress import IPv4Address, IPv6Address, ip_address

from fastapi import Request

from faust_api.settings import get_settings

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5
WINDOW = timedelta(minutes=10)

UNKNOWN_CLIENT = "unknown"

SWEEP_THRESHOLD = 1024
"""Above this many buckets the window is swept before a new one is opened."""


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
        self._sweep()

        attempts = self._failures.setdefault(key, deque())
        attempts.append(datetime.now(UTC))

        if len(attempts) >= self.max_attempts:
            logger.warning("[auth] %s вичерпав спроби входу", key)

    def _sweep(self) -> None:
        """Drops buckets whose window ran out and that nobody asked about again.

        `_recent` only cleans the key it is called with, so a run of failures
        from many addresses leaves an entry per address behind forever. The
        sweep costs one pass over a dict that stays small precisely because of
        it, and it only runs once the dict is bigger than one attacker's worth.
        """
        if len(self._failures) <= SWEEP_THRESHOLD:
            return

        threshold = datetime.now(UTC) - self.window

        stale = [key for key, attempts in self._failures.items() if not attempts or attempts[-1] < threshold]

        for key in stale:
            self._failures.pop(key, None)

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

    The chain is read from the **right**, not the left. Every proxy appends the
    address it saw, so the right-hand end is what our own edge observed and the
    left-hand end is whatever the browser felt like sending. Caddy appends to a
    header the visitor supplied rather than replacing it, so trusting the
    left-most entry means trusting the attacker: five guesses per forged
    address is no limit at all. Walking right to left past the addresses we
    know are ours lands on the first one we did not write down ourselves.
    """
    peer = request.client.host if request.client else None

    if peer is None:
        return UNKNOWN_CLIENT

    if not _is_trusted(peer):
        return peer

    forwarded = request.headers.get("x-forwarded-for", "")

    for entry in reversed(forwarded.split(",")):
        candidate = _as_address(entry)

        # Anything that is not an address was invented by the caller: our own
        # proxies only ever append a real one. Skipping it rather than using it
        # as a key is what keeps a chain of nonsense from minting fresh buckets.
        if candidate is not None and not _is_trusted_address(candidate):
            return str(candidate)

    # Everything in the chain is a proxy of ours, or the header says nothing
    # usable. The peer is then the closest thing to an answer there is.
    return peer


def _as_address(entry: str) -> IPv4Address | IPv6Address | None:
    try:
        return ip_address(entry.strip())
    except ValueError:
        return None


def _is_trusted_address(address: IPv4Address | IPv6Address) -> bool:
    networks = get_settings().trusted_proxy_networks

    return any(address in network for network in networks)


def _is_trusted(peer: str) -> bool:
    address = _as_address(peer)

    return address is not None and _is_trusted_address(address)
