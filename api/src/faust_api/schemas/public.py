"""The two public endpoints of §5.3, field by field.

Three names differ from the database on purpose, because the frontend was
written against them and renaming a column must not reach the showcase:
`title` → `label`, `composition` → `description`, `image_key` → `image` (an
absolute URL). Everything else is the column.

What the API decides here and the frontend never repeats: hidden rows are gone,
both levels are already sorted, and `price` is a whole number of hryvnias.
"""

import uuid

from faust_api.models import AtmospherePhoto, MenuCategory, MenuItem, MenuItemBadge
from faust_api.schemas.base import ApiModel
from faust_api.services.images import photo_url


class PublicMenuItem(ApiModel):
    id: uuid.UUID
    name: str
    description: str | None
    price: int
    volume: str | None
    image: str | None
    image_alt: str | None
    badge: MenuItemBadge | None
    available: bool
    """False dims the card and adds "немає" — it never hides the position (§5.3)."""

    @classmethod
    def of(cls, item: MenuItem) -> "PublicMenuItem":
        return cls(
            id=item.id,
            name=item.name,
            description=item.composition,
            price=item.price,
            volume=item.volume,
            image=photo_url(item.image_key),
            image_alt=item.image_alt,
            badge=item.badge,
            available=item.available,
        )


class PublicMenuCategory(ApiModel):
    slug: str
    """Stable and url-safe: this is the #anchor of /menu, saved links depend on it."""

    label: str
    note: str | None
    items: list[PublicMenuItem]

    @classmethod
    def of(cls, category: MenuCategory) -> "PublicMenuCategory":
        return cls(
            slug=category.slug,
            label=category.title,
            note=category.note,
            items=[PublicMenuItem.of(item) for item in category.items],
        )


class MenuResponse(ApiModel):
    categories: list[PublicMenuCategory]
    """An empty list is a valid answer: the page shows an empty state, not an error."""


class PublicAtmospherePhoto(ApiModel):
    id: uuid.UUID
    label: str
    """The caption on the tile — not the same text as `imageAlt`."""

    image: str
    image_alt: str

    @classmethod
    def of(cls, photo: AtmospherePhoto) -> "PublicAtmospherePhoto":
        url = photo_url(photo.image_key)
        # image_key is NOT NULL, so this only trips if the column was emptied
        # behind the model's back.
        assert url is not None

        return cls(id=photo.id, label=photo.label, image=url, image_alt=photo.image_alt)


class AtmosphereResponse(ApiModel):
    photos: list[PublicAtmospherePhoto]
