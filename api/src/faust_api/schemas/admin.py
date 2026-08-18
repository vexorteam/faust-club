"""Bodies and answers of the admin API (§5.3.1).

The frontend already has the mirror of this file — `faust/src/schemas/*.ts` —
and those schemas are strict: unlike the public menu, where a broken position
is dropped so the rest of the card survives, the admin panel fails the whole
request rather than quietly hide a row the owner is looking for. So a rename
here is a blank admin panel there, and the names below are the contract.

Three of them differ from the columns, exactly as on the public side:
`title` → `label`, `composition` → `description`, `image_key` → `image` (a
ready absolute URL — the storage key never leaves the process).

Requests arrive in camelCase and `ApiModel` accepts both spellings, so
`categoryId` and `category_id` both land in the same field.
"""

import re
import uuid
from typing import Annotated, Any, Literal

from pydantic import AfterValidator, BaseModel, Field, StringConstraints

from faust_api.errors import ValidationError
from faust_api.models import MenuCategory, MenuItem, MenuItemBadge
from faust_api.models.category import NOTE_LENGTH as NOTE_MAX
from faust_api.models.category import SLUG_LENGTH as SLUG_MAX
from faust_api.models.category import TITLE_LENGTH as LABEL_MAX
from faust_api.models.item import COMPOSITION_LENGTH as DESCRIPTION_MAX
from faust_api.models.item import IMAGE_ALT_LENGTH as IMAGE_ALT_MAX
from faust_api.models.item import NAME_LENGTH as NAME_MAX
from faust_api.models.item import VOLUME_LENGTH as VOLUME_MAX
from faust_api.schemas.base import ApiModel
from faust_api.services.images import photo_url

LABEL_MIN = 2
NAME_MIN = 2
PRICE_MIN = 1
PRICE_MAX = 99999

SLUG_PATTERN = re.compile(r"^[a-z0-9-]+$")
SLUG_MESSAGE = "Адреса — лише малі латинські літери, цифри й дефіс"

EMPTY_PATCH_MESSAGE = "Немає що змінювати"


def blank_to_none(value: str | None) -> str | None:
    """An empty field and an absent one mean the same thing to the database: `null`."""
    return value or None


def url_safe(value: str) -> str:
    """The slug is the #anchor of /menu, so anything a URL would mangle is refused.

    Written as a validator rather than a `pattern=` constraint so the answer
    says what a correct address looks like, instead of "Недопустимі символи".
    """
    if not SLUG_PATTERN.match(value):
        raise ValueError(SLUG_MESSAGE)

    return value


def not_null[Value](value: Value | None) -> Value | None:
    """Guards a field a patch may omit but must not empty.

    Only runs on values that were actually sent — pydantic does not validate
    defaults — so omitting `slug` is fine and sending `"slug": null` is not.
    """
    if value is None:
        raise ValueError("Поле не можна лишити порожнім")

    return value


Slug = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_lower=True, min_length=1, max_length=SLUG_MAX),
    AfterValidator(url_safe),
]
"""The #anchor of /menu. Saved links depend on it, which is why it is editable
by hand and never regenerated behind the owner's back."""

Label = Annotated[str, StringConstraints(strip_whitespace=True, min_length=LABEL_MIN, max_length=LABEL_MAX)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=NAME_MIN, max_length=NAME_MAX)]
Price = Annotated[int, Field(ge=PRICE_MIN, le=PRICE_MAX)]
"""Whole hryvnias, always. There are no kopecks behind a bar (§11)."""

Note = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=NOTE_MAX)] | None,
    AfterValidator(blank_to_none),
]
Description = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=DESCRIPTION_MAX)] | None,
    AfterValidator(blank_to_none),
]
Volume = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=VOLUME_MAX)] | None,
    AfterValidator(blank_to_none),
]
ImageAlt = Annotated[
    Annotated[str, StringConstraints(strip_whitespace=True, max_length=IMAGE_ALT_MAX)] | None,
    AfterValidator(blank_to_none),
]


def changes_of(patch: BaseModel) -> dict[str, Any]:
    """What the owner actually sent, in column names.

    `exclude_unset` is what separates "leave the note alone" from "clear the
    note": both arrive as `None`, only the second one was written down. An
    empty patch is refused — it is a write that changes nothing.
    """
    changed = patch.model_dump(exclude_unset=True, by_alias=False)

    if not changed:
        raise ValidationError(EMPTY_PATCH_MESSAGE)

    return changed


# ── Categories ────────────────────────────────────────────────────────────


class CategoryCreate(ApiModel):
    slug: Slug
    label: Label
    note: Note = None
    visible: bool = True


class CategoryPatch(ApiModel):
    """Any subset of the fields, so an inline rename resends only the name."""

    slug: Annotated[Slug | None, AfterValidator(not_null)] = None
    label: Annotated[Label | None, AfterValidator(not_null)] = None
    note: Note = None
    visible: Annotated[bool | None, AfterValidator(not_null)] = None


class AdminCategory(ApiModel):
    id: uuid.UUID
    slug: str
    label: str
    note: str | None
    order: int
    visible: bool
    items_count: int
    """Counted here, never by the form: the panel must not guess what the database holds."""

    @classmethod
    def of(cls, category: MenuCategory, items_count: int) -> "AdminCategory":
        return cls(
            id=category.id,
            slug=category.slug,
            label=category.title,
            note=category.note,
            order=category.order,
            visible=category.visible,
            items_count=items_count,
        )


class CategoriesResponse(ApiModel):
    categories: list[AdminCategory]


class CategoryResponse(ApiModel):
    category: AdminCategory


# ── Menu items ────────────────────────────────────────────────────────────


class ItemCreate(ApiModel):
    category_id: uuid.UUID
    """A position always belongs to a category — there are no loose drinks (§5.2)."""

    name: Name
    description: Description = None
    price: Price
    volume: Volume = None
    badge: MenuItemBadge | None = None
    available: bool = True


class ItemPatch(ApiModel):
    """`categoryId` included: changing it is how a position moves elsewhere.

    `imageAlt` is here too — the addition to §5.3.1 agreed in §13.4, so the
    description of a photo can be fixed without re-uploading the photo.
    """

    category_id: Annotated[uuid.UUID | None, AfterValidator(not_null)] = None
    name: Annotated[Name | None, AfterValidator(not_null)] = None
    description: Description = None
    price: Annotated[Price | None, AfterValidator(not_null)] = None
    volume: Volume = None
    image_alt: ImageAlt = None
    badge: MenuItemBadge | None = None
    available: Annotated[bool | None, AfterValidator(not_null)] = None


class AdminMenuItem(ApiModel):
    id: uuid.UUID
    category_id: uuid.UUID
    name: str
    description: str | None
    price: int
    volume: str | None
    image: str | None
    image_alt: str | None
    badge: MenuItemBadge | None
    available: bool
    order: int

    @classmethod
    def of(cls, item: MenuItem) -> "AdminMenuItem":
        return cls(
            id=item.id,
            category_id=item.category_id,
            name=item.name,
            description=item.composition,
            price=item.price,
            volume=item.volume,
            image=photo_url(item.image_key),
            image_alt=item.image_alt,
            badge=item.badge,
            available=item.available,
            order=item.order,
        )


class ItemGroup(ApiModel):
    """A category as the item list shows it: no note, no count, but its items."""

    id: uuid.UUID
    slug: str
    label: str
    visible: bool
    items: list[AdminMenuItem]

    @classmethod
    def of(cls, category: MenuCategory) -> "ItemGroup":
        return cls(
            id=category.id,
            slug=category.slug,
            label=category.title,
            visible=category.visible,
            items=[AdminMenuItem.of(item) for item in category.items],
        )


class ItemsResponse(ApiModel):
    categories: list[ItemGroup]


class ItemResponse(ApiModel):
    item: AdminMenuItem


# ── Shared ────────────────────────────────────────────────────────────────


class MoveRequest(ApiModel):
    direction: Literal["up", "down"]


class Acknowledged(ApiModel):
    """Deletes and moves answer with nothing worth reading (§5.3.1)."""

    ok: bool = True
