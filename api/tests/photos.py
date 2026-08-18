"""Pictures for the upload tests, built rather than committed.

Keeping binary fixtures in the repository would mean nobody can tell what is
inside them; a frame described in code says exactly what it is — its format,
its size, and which way up it is supposed to come out.
"""

from io import BytesIO

import pillow_heif
from PIL import Image

pillow_heif.register_heif_opener()

RED = (220, 40, 90)
BLUE = (40, 80, 220)

ORIENTATION_TAG = 0x0112
ROTATE_RIGHT = 6
"""EXIF orientation 6: "turn me 90° clockwise before showing me" — what every
phone writes instead of rotating the pixels."""


def _encode(image: Image.Image, image_format: str, **options: object) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format=image_format, **options)

    return buffer.getvalue()


def jpeg(size: tuple[int, int] = (200, 200)) -> bytes:
    return _encode(Image.new("RGB", size, RED), "JPEG")


def png(size: tuple[int, int] = (200, 200)) -> bytes:
    return _encode(Image.new("RGB", size, BLUE), "PNG")


def webp(size: tuple[int, int] = (200, 200)) -> bytes:
    return _encode(Image.new("RGB", size, RED), "WEBP")


def heic(size: tuple[int, int] = (200, 200)) -> bytes:
    """What an iPhone hands over — and what Safari hands over with no MIME type."""
    return _encode(Image.new("RGB", size, BLUE), "HEIF")


def transparent_png(size: tuple[int, int] = (200, 200)) -> bytes:
    return _encode(Image.new("RGBA", size, (*RED, 128)), "PNG")


def portrait_from_phone() -> bytes:
    """A portrait frame stored sideways, with the rotation only in EXIF.

    Displayed correctly it is red on top and blue underneath. Stored, it is not
    — which is the whole point: a viewer that ignores the tag shows it on its
    side, and so would the showcase if the API did not turn it.
    """
    upright = Image.new("RGB", (400, 600), RED)
    upright.paste(Image.new("RGB", (400, 300), BLUE), (0, 300))

    # The inverse of the rotation the tag asks for, so applying the tag brings
    # the frame back to `upright`.
    sideways = upright.transpose(Image.Transpose.ROTATE_90)

    exif = Image.Exif()
    exif[ORIENTATION_TAG] = ROTATE_RIGHT

    return _encode(sideways, "JPEG", exif=exif)


def pdf_pretending_to_be_a_photo() -> bytes:
    """A PDF called `.jpg`. Only the first bytes give it away."""
    return b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"


def oversized() -> bytes:
    """Six megabytes. What is inside does not matter — the size decides first."""
    return b"\xff\xd8\xff" + bytes(6 * 1024 * 1024)
