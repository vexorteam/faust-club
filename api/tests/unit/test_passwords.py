"""Hashing the owner's password. The seed is its first caller; login follows in Б4."""

import pytest

from faust_api.security.passwords import COST, PasswordTooLongError, hash_password


def test_the_hash_carries_the_agreed_cost() -> None:
    """§3.5 says cost ≥ 12, and the prefix is where that is visible."""
    assert hash_password("нічна зміна 22:00").startswith(f"$2b${COST}$")


def test_the_same_password_hashes_differently_every_time() -> None:
    """Different salts: two admins with one password must not look alike in the dump."""
    password = "нічна зміна 22:00"

    assert hash_password(password) != hash_password(password)


def test_the_plain_password_is_not_inside_the_hash() -> None:
    assert "faust" not in hash_password("faust")


def test_a_password_longer_than_bcrypt_reads_is_refused() -> None:
    """bcrypt stops at 72 bytes. Truncating quietly would make two passwords one."""
    with pytest.raises(PasswordTooLongError):
        hash_password("я" * 40)


def test_a_long_password_that_still_fits_is_accepted() -> None:
    assert hash_password("a" * 72)
