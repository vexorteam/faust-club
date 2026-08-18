"""What happens to a photo between the phone and the volume.

The three promises this module holds the service to: the format is decided by
what is inside the file, a frame comes out the way it was taken, and nothing
but pixels reaches the disk.
"""

import pathlib
import uuid
from io import BytesIO

import pytest
from fastapi import UploadFile
from PIL import Image

from faust_api.errors import (
    FileTooLargeError,
    NotFoundError,
    StorageError,
    UnsupportedFileError,
    ValidationError,
)
from faust_api.services import images
from faust_api.services.images import (
    MAX_UPLOAD_MB,
    MENU_FOLDER,
    VARIANTS,
    accept_upload,
    detect_format,
    file_path,
    photo_url,
    remove_photo,
    resolve_media,
    store_photo,
)
from tests import photos


def upload(data: bytes, name: str = "photo.jpg") -> UploadFile:
    return UploadFile(BytesIO(data), filename=name, size=len(data))


# ── Recognising the format ────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("data", "expected"),
    [
        (photos.jpeg(), "jpeg"),
        (photos.png(), "png"),
        (photos.webp(), "webp"),
        (photos.heic(), "heic"),
    ],
)
def test_detects_every_allowed_format(data: bytes, expected: str) -> None:
    assert detect_format(data) == expected


def test_a_pdf_named_jpg_is_not_a_photo() -> None:
    """The extension is a claim; the first bytes are the evidence (§5.3.1)."""
    with pytest.raises(UnsupportedFileError) as refusal:
        detect_format(photos.pdf_pretending_to_be_a_photo())

    assert refusal.value.status == 415


def test_a_video_container_is_refused() -> None:
    """`ftyp` alone is not enough — an mp4 shares the box, not the brand."""
    with pytest.raises(UnsupportedFileError):
        detect_format(b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom")


# ── Reading the upload ────────────────────────────────────────────────────


async def test_oversized_upload_is_refused_with_its_size() -> None:
    with pytest.raises(FileTooLargeError) as refusal:
        await accept_upload(upload(photos.oversized()))

    assert refusal.value.status == 413
    assert f"Максимум — {MAX_UPLOAD_MB} МБ" in refusal.value.message
    assert "6.0 МБ" in refusal.value.message


async def test_missing_file_asks_for_one() -> None:
    """An empty form field is named, like every other missing field is."""
    with pytest.raises(ValidationError) as refusal:
        await accept_upload(None)

    assert refusal.value.status == 400
    assert refusal.value.fields == {"file": "Виберіть фото"}


async def test_empty_file_is_refused() -> None:
    with pytest.raises(ValidationError) as refusal:
        await accept_upload(upload(b""))

    assert refusal.value.fields is not None
    assert "file" in refusal.value.fields


# ── Storing ───────────────────────────────────────────────────────────────


async def test_stores_three_variants() -> None:
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.jpeg())

    for variant, size in VARIANTS.items():
        path = file_path(key, variant)

        assert path.is_file()

        with Image.open(path) as rendered:
            assert rendered.format == "WEBP"
            assert rendered.size == (size, size)


async def test_heic_from_a_phone_is_accepted() -> None:
    """Safari sends the frame with an empty MIME type; the bytes still say HEIC."""
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.heic())

    assert file_path(key, "card").is_file()


async def test_portrait_photo_comes_out_upright() -> None:
    """The camera stores the frame sideways and marks the turn in EXIF.

    Red on top, blue underneath — that is what the photographer saw. Without
    `exif_transpose` the halves would end up left and right instead.
    """
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.portrait_from_phone())

    with Image.open(file_path(key, "card")) as card:
        rendered = card.convert("RGB")
        width, height = rendered.size

        top = rendered.getpixel((width // 2, height // 8))
        bottom = rendered.getpixel((width // 2, height * 7 // 8))

    assert isinstance(top, tuple) and isinstance(bottom, tuple)
    assert top[0] > top[2], "верх кадру має лишитись червоним"
    assert bottom[2] > bottom[0], "низ кадру має лишитись синім"


async def test_metadata_does_not_reach_the_volume() -> None:
    """A photo of a cocktail must not carry the GPS of the bar around with it."""
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.portrait_from_phone())

    with Image.open(file_path(key, "card")) as card:
        assert not card.getexif()
        assert "exif" not in card.info


async def test_the_same_frame_twice_keeps_one_name() -> None:
    """The name is the hash of the content, which is what makes /media immutable."""
    owner = uuid.uuid4()

    first = await store_photo(MENU_FOLDER, owner, photos.jpeg())
    second = await store_photo(MENU_FOLDER, owner, photos.jpeg())

    assert first == second


async def test_two_owners_never_share_files() -> None:
    """Otherwise deleting one position would blank out another one's photo."""
    frame = photos.jpeg()

    assert await store_photo(MENU_FOLDER, uuid.uuid4(), frame) != await store_photo(
        MENU_FOLDER, uuid.uuid4(), frame
    )


async def test_a_different_frame_gets_a_different_name() -> None:
    owner = uuid.uuid4()

    assert await store_photo(MENU_FOLDER, owner, photos.jpeg()) != await store_photo(
        MENU_FOLDER, owner, photos.png()
    )


async def test_transparent_png_survives_the_resize() -> None:
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.transparent_png())

    with Image.open(file_path(key, "card")) as card:
        assert card.mode in {"RGBA", "RGB"}


async def test_a_corrupt_frame_is_refused_not_crashed() -> None:
    """Right magic bytes, nothing decodable behind them."""
    with pytest.raises(UnsupportedFileError):
        await store_photo(MENU_FOLDER, uuid.uuid4(), b"\xff\xd8\xff" + bytes(64))


async def test_a_volume_that_refuses_to_write_is_a_storage_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """The database is untouched at that point, and the owner is told to retry."""

    def refuse(self: object, data: bytes) -> int:
        raise OSError("no space left on device")

    monkeypatch.setattr("pathlib.Path.write_bytes", refuse)

    with pytest.raises(StorageError) as failure:
        await store_photo(MENU_FOLDER, uuid.uuid4(), photos.jpeg())

    assert failure.value.status == 500
    assert "Не вдалося зберегти фото" in failure.value.message


async def test_a_half_written_photo_leaves_nothing_behind(monkeypatch: pytest.MonkeyPatch) -> None:
    """A stray pair of files nobody points at would never be cleaned up."""
    written = pathlib.Path.write_bytes
    calls = {"count": 0}

    def fail_on_the_second(self: pathlib.Path, data: bytes) -> int:
        calls["count"] += 1

        if calls["count"] == 2:
            raise OSError("no space left on device")

        return written(self, data)

    monkeypatch.setattr(pathlib.Path, "write_bytes", fail_on_the_second)

    with pytest.raises(StorageError):
        await store_photo(MENU_FOLDER, uuid.uuid4(), photos.jpeg())

    root = images.storage_root() / MENU_FOLDER
    leftovers = list(root.iterdir()) if root.exists() else []

    assert leftovers == []


# ── Removing ──────────────────────────────────────────────────────────────


async def test_removing_takes_all_three_variants() -> None:
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.jpeg())

    await remove_photo(key)

    assert not any(file_path(key, variant).exists() for variant in VARIANTS)


async def test_removing_a_photo_that_is_already_gone_is_quiet() -> None:
    """It runs after the row is gone: a refusing volume must not become an error."""
    await remove_photo(f"{MENU_FOLDER}/{uuid.uuid4().hex}-0123456789abcdef")
    await remove_photo(None)


# ── Addresses ─────────────────────────────────────────────────────────────


def test_photo_url_points_at_the_card_variant() -> None:
    assert photo_url("menu/abc-0123") == "http://localhost:8000/media/menu/abc-0123-card.webp"


def test_no_key_means_no_url() -> None:
    assert photo_url(None) is None


async def test_media_resolves_a_stored_photo() -> None:
    key = await store_photo(MENU_FOLDER, uuid.uuid4(), photos.jpeg())

    assert resolve_media(f"{key}-card.webp").is_file()


@pytest.mark.parametrize(
    "name",
    [
        "../../etc/passwd",
        "menu/../../../etc/passwd-card.webp",
        "menu/abc-card.webp/../../secret",
        "secrets/abc-card.webp",
        "menu/abc-original.webp",
        "menu/abc-card.jpg",
    ],
)
def test_a_request_cannot_describe_a_location(name: str) -> None:
    """The names are generated by the server, so anything else is a 404."""
    with pytest.raises(NotFoundError):
        resolve_media(name)
