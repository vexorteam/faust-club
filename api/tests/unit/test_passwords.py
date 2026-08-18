"""Hashing and checking the owner's password. The seed writes one, login reads it."""

import pytest

from faust_api.security.passwords import COST, PasswordTooLongError, hash_password, verify_password


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


def test_the_right_password_matches_its_hash() -> None:
    password = "нічна зміна 22:00"

    assert verify_password(password, hash_password(password))


def test_a_wrong_password_does_not_match() -> None:
    assert verify_password("майже вгадав", hash_password("нічна зміна 22:00")) is False


def test_a_password_past_the_bcrypt_limit_never_matches_a_shorter_one() -> None:
    """The 72-byte cut-off must not turn a long guess into a valid one."""
    stored = hash_password("a" * 72)

    assert verify_password("a" * 100, stored) is False


def test_a_broken_hash_is_a_failed_login_not_a_crash() -> None:
    """A damaged row answers 401, not 500 — the visitor is not the one at fault."""
    assert verify_password("нічна зміна 22:00", "це не bcrypt-хеш") is False
