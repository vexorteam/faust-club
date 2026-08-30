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
from faust_api.models import (
    AtmospherePhoto,
    MenuCategory,
    MenuItem,
    MenuItemBadge,
    OperatingHours,
    SiteSettings,
    SocialLink,
    Testimonial,
)
from faust_api.models.atmosphere import LABEL_LENGTH as TILE_LABEL_MAX
from faust_api.models.category import NOTE_LENGTH as NOTE_MAX
from faust_api.models.category import SLUG_LENGTH as SLUG_MAX
from faust_api.models.category import TITLE_LENGTH as LABEL_MAX
from faust_api.models.item import COMPOSITION_LENGTH as DESCRIPTION_MAX
from faust_api.models.item import IMAGE_ALT_LENGTH as IMAGE_ALT_MAX
from faust_api.models.item import NAME_LENGTH as NAME_MAX
from faust_api.models.item import VOLUME_LENGTH as VOLUME_MAX
from faust_api.models.settings import (
    ADDRESS_LENGTH as ADDRESS_MAX,
)
from faust_api.models.settings import (
    ADDRESS_SHORT_LENGTH as ADDRESS_SHORT_MAX,
)
from faust_api.models.settings import (
    AGE_RESTRICTION_LENGTH as AGE_RESTRICTION_MAX,
)
from faust_api.models.settings import (
    DESCRIPTION_LENGTH as SITE_DESCRIPTION_MAX,
)
from faust_api.models.settings import (
    EMAIL_LENGTH as EMAIL_MAX,
)
from faust_api.models.settings import (
    NAME_LENGTH as SITE_NAME_MAX,
)
from faust_api.models.settings import (
    PHONE_LENGTH as PHONE_MAX,
)
from faust_api.models.settings import (
    SOCIAL_HANDLE_LENGTH as SOCIAL_HANDLE_MAX,
)
from faust_api.models.settings import (
    SOCIAL_NAME_LENGTH as SOCIAL_NAME_MAX,
)
from faust_api.models.settings import (
    TAGLINE_LENGTH as TAGLINE_MAX,
)
from faust_api.models.settings import (
    URL_LENGTH as URL_MAX,
)
from faust_api.models.testimonial import META_LENGTH as TESTIMONIAL_META_MAX
from faust_api.models.testimonial import NAME_LENGTH as TESTIMONIAL_NAME_MAX
from faust_api.models.testimonial import TEXT_LENGTH as TESTIMONIAL_TEXT_MAX
from faust_api.schemas.base import ApiModel
from faust_api.services.images import photo_url

LABEL_MIN = 2
NAME_MIN = 2
IMAGE_ALT_MIN = 5
"""Same floor as the frontend's `imageAltSchema`: "фото" is not a description."""

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

RequiredImageAlt = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=IMAGE_ALT_MIN, max_length=IMAGE_ALT_MAX)
]
"""A photo arrives with its description or not at all: a picture nobody can see
and nobody can read is worse than no picture (§5.2)."""

TileLabel = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=LABEL_MIN, max_length=TILE_LABEL_MAX)
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


# ── Atmosphere tiles ──────────────────────────────────────────────────────


class AtmospherePatch(ApiModel):
    """Texts and visibility only.

    Replacing the picture is its own multipart endpoint, because the two are
    different kinds of failure: a typo fixed in the caption must not be rolled
    back because an upload timed out (§5.3.1).
    """

    label: Annotated[TileLabel | None, AfterValidator(not_null)] = None
    image_alt: Annotated[RequiredImageAlt | None, AfterValidator(not_null)] = None
    visible: Annotated[bool | None, AfterValidator(not_null)] = None


class AdminAtmospherePhoto(ApiModel):
    id: uuid.UUID
    label: str
    """The caption the visitor reads on the tile."""

    image: str
    """Never null: a tile *is* its picture (§13.4)."""

    image_alt: str
    order: int
    visible: bool

    @classmethod
    def of(cls, photo: AtmospherePhoto) -> "AdminAtmospherePhoto":
        url = photo_url(photo.image_key)
        # image_key is NOT NULL, so this only trips if the column was emptied
        # behind the model's back.
        assert url is not None

        return cls(
            id=photo.id,
            label=photo.label,
            image=url,
            image_alt=photo.image_alt,
            order=photo.order,
            visible=photo.visible,
        )


class AtmospherePhotosResponse(ApiModel):
    photos: list[AdminAtmospherePhoto]


class AtmospherePhotoResponse(ApiModel):
    photo: AdminAtmospherePhoto


# ── Site settings ─────────────────────────────────────────────────────────

SiteName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=LABEL_MIN, max_length=SITE_NAME_MAX)
]
Tagline = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=LABEL_MIN, max_length=TAGLINE_MAX)
]
SiteDescription = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=LABEL_MIN, max_length=SITE_DESCRIPTION_MAX)
]
Phone = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=PHONE_MAX)]
Email = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=EMAIL_MAX)]
Address = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=ADDRESS_MAX)]
AddressShort = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=ADDRESS_SHORT_MAX)
]
Url = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=URL_MAX)]
AgeRestriction = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=AGE_RESTRICTION_MAX)
]


class SiteSettingsPatch(ApiModel):
    """Any subset of the club's own facts — the same inline-save pattern as a category."""

    name: Annotated[SiteName | None, AfterValidator(not_null)] = None
    tagline: Annotated[Tagline | None, AfterValidator(not_null)] = None
    description: Annotated[SiteDescription | None, AfterValidator(not_null)] = None
    phone: Annotated[Phone | None, AfterValidator(not_null)] = None
    phone_href: Annotated[Phone | None, AfterValidator(not_null)] = None
    email: Annotated[Email | None, AfterValidator(not_null)] = None
    email_href: Annotated[Email | None, AfterValidator(not_null)] = None
    address: Annotated[Address | None, AfterValidator(not_null)] = None
    address_short: Annotated[AddressShort | None, AfterValidator(not_null)] = None
    maps_url: Annotated[Url | None, AfterValidator(not_null)] = None
    maps_embed_query: Annotated[Address | None, AfterValidator(not_null)] = None
    latitude: Annotated[float | None, AfterValidator(not_null)] = None
    longitude: Annotated[float | None, AfterValidator(not_null)] = None
    age_restriction: Annotated[AgeRestriction | None, AfterValidator(not_null)] = None


class AdminSiteSettings(ApiModel):
    id: uuid.UUID
    name: str
    tagline: str
    description: str
    phone: str
    phone_href: str
    email: str
    email_href: str
    address: str
    address_short: str
    maps_url: str
    maps_embed_query: str
    latitude: float
    longitude: float
    age_restriction: str

    @classmethod
    def of(cls, settings: SiteSettings) -> "AdminSiteSettings":
        return cls(
            id=settings.id,
            name=settings.name,
            tagline=settings.tagline,
            description=settings.description,
            phone=settings.phone,
            phone_href=settings.phone_href,
            email=settings.email,
            email_href=settings.email_href,
            address=settings.address,
            address_short=settings.address_short,
            maps_url=settings.maps_url,
            maps_embed_query=settings.maps_embed_query,
            latitude=settings.latitude,
            longitude=settings.longitude,
            age_restriction=settings.age_restriction,
        )


class SiteSettingsResponse(ApiModel):
    settings: AdminSiteSettings


# ── Social links ──────────────────────────────────────────────────────────


class SocialCreate(ApiModel):
    name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=SOCIAL_NAME_MAX)
    ]
    href: Url
    handle: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=SOCIAL_HANDLE_MAX)
    ]


class SocialPatch(ApiModel):
    name: Annotated[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=SOCIAL_NAME_MAX)]
        | None,
        AfterValidator(not_null),
    ] = None
    href: Annotated[Url | None, AfterValidator(not_null)] = None
    handle: Annotated[
        Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=SOCIAL_HANDLE_MAX)]
        | None,
        AfterValidator(not_null),
    ] = None


class AdminSocialLink(ApiModel):
    id: uuid.UUID
    name: str
    href: str
    handle: str
    order: int

    @classmethod
    def of(cls, social: SocialLink) -> "AdminSocialLink":
        return cls(id=social.id, name=social.name, href=social.href, handle=social.handle, order=social.order)


class SocialLinksResponse(ApiModel):
    socials: list[AdminSocialLink]


class SocialLinkResponse(ApiModel):
    social: AdminSocialLink


# ── Operating hours ───────────────────────────────────────────────────────

DayTime = Annotated[
    Annotated[str, StringConstraints(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")] | None,
    AfterValidator(blank_to_none),
]


class HoursPatch(ApiModel):
    """A day is either open with both times set, or closed with neither."""

    open: DayTime = None
    close: DayTime = None
    closes_next_day: bool | None = None


class AdminOperatingHours(ApiModel):
    id: uuid.UUID
    day: int
    label: str
    open: str | None
    close: str | None
    closes_next_day: bool

    @classmethod
    def of(cls, hours: OperatingHours) -> "AdminOperatingHours":
        return cls(
            id=hours.id,
            day=hours.day,
            label=hours.label,
            open=hours.open,
            close=hours.close,
            closes_next_day=hours.closes_next_day,
        )


class OperatingHoursResponse(ApiModel):
    hours: list[AdminOperatingHours]


class OperatingHoursDayResponse(ApiModel):
    hours: AdminOperatingHours


# ── Testimonials ──────────────────────────────────────────────────────────

TestimonialText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=LABEL_MIN, max_length=TESTIMONIAL_TEXT_MAX)
]
TestimonialName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=TESTIMONIAL_NAME_MAX)
]
TestimonialMeta = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=TESTIMONIAL_META_MAX)
]


class TestimonialCreate(ApiModel):
    text: TestimonialText
    name: TestimonialName
    meta: TestimonialMeta
    visible: bool = True


class TestimonialPatch(ApiModel):
    text: Annotated[TestimonialText | None, AfterValidator(not_null)] = None
    name: Annotated[TestimonialName | None, AfterValidator(not_null)] = None
    meta: Annotated[TestimonialMeta | None, AfterValidator(not_null)] = None
    visible: Annotated[bool | None, AfterValidator(not_null)] = None


class AdminTestimonial(ApiModel):
    id: uuid.UUID
    text: str
    name: str
    meta: str
    order: int
    visible: bool

    @classmethod
    def of(cls, testimonial: Testimonial) -> "AdminTestimonial":
        return cls(
            id=testimonial.id,
            text=testimonial.text,
            name=testimonial.name,
            meta=testimonial.meta,
            order=testimonial.order,
            visible=testimonial.visible,
        )


class TestimonialsResponse(ApiModel):
    testimonials: list[AdminTestimonial]


class TestimonialResponse(ApiModel):
    testimonial: AdminTestimonial


# ── Uploads ───────────────────────────────────────────────────────────────


class ItemImageResponse(ApiModel):
    """The answer to a menu photo upload — not the whole position (§5.3.1)."""

    image: str
    image_alt: str


# ── Shared ────────────────────────────────────────────────────────────────


class MoveRequest(ApiModel):
    direction: Literal["up", "down"]


class Acknowledged(ApiModel):
    """Deletes and moves answer with nothing worth reading (§5.3.1)."""

    ok: bool = True