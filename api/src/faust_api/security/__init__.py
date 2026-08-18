"""Passwords, tokens and the dependency that turns a Bearer header into an admin.

Only the password hashing exists so far — the seed needs it to write the first
administrator. Token signing and the request dependency arrive in Б4.
"""
