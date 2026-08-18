"""Photos: from a storage key to a URL the visitor's browser can fetch.

The database keeps a key (`menu/9f3a`), never a URL — the frontend must not
learn the layout of the volume (§5.2). The public address is assembled here,
out of `MEDIA_BASE_URL` and the variant the showcase actually renders.

Resizing, EXIF and magic bytes arrive in Б6; this module starts with the one
part the public menu already needs.
"""

from faust_api.settings import get_settings

CARD_VARIANT = "card"
"""640px — what a menu card and an atmosphere tile show. `thumb` and `full` are Б6."""

EXTENSION = "webp"


def photo_url(image_key: str | None) -> str | None:
    """Absolute URL of a stored photo, or `None` when there is no photo.

    The name carries the variant, so a file is never overwritten and the whole
    `/media` prefix can be served as `immutable`.
    """
    if not image_key:
        return None

    return f"{get_settings().media_prefix}/{image_key}-{CARD_VARIANT}.{EXTENSION}"
