"""bcrypt, cost 12 (§3.5).

A plain password only ever exists inside one call: it comes in as an argument
and leaves as a hash. It is never stored, never logged and never written into
the seed or the code.
"""

import bcrypt

COST = 12

# bcrypt silently ignores everything past the 72nd byte of a password. Silently
# is the problem: two different long passwords would open the same account.
MAX_PASSWORD_BYTES = 72


class PasswordTooLongError(ValueError):
    """Raised instead of quietly truncating."""


def hash_password(password: str) -> str:
    encoded = password.encode("utf-8")

    if len(encoded) > MAX_PASSWORD_BYTES:
        raise PasswordTooLongError(f"Пароль задовгий: {len(encoded)} байтів, максимум — {MAX_PASSWORD_BYTES}")

    return bcrypt.hashpw(encoded, bcrypt.gensalt(rounds=COST)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time comparison against a stored hash.

    A password past bcrypt's 72-byte limit is rejected here too, for the same
    reason it is rejected when hashing: it must not silently match a shorter
    one. A malformed hash in the column answers `False` instead of crashing —
    a broken row is a failed login, not a 500.
    """
    encoded = password.encode("utf-8")

    if len(encoded) > MAX_PASSWORD_BYTES:
        return False

    try:
        return bcrypt.checkpw(encoded, password_hash.encode("utf-8"))
    except ValueError:
        return False
