"""Passwords, tokens and the dependency that turns a Bearer header into an admin.

The signing secret of the session tokens exists in this package and nowhere
else — the frontend carries a token it never opens (§5.4), so verifying one is
this application's job alone.
"""
