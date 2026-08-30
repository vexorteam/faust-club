"""Fills an empty database: the first administrator and a demo bar card.

Run it once after the migrations:

    uv run python -m faust_api.seed

Two rules it obeys. The administrator is always ensured, so the command is also
the answer to "the owner is not in the database yet". The demo content is only
written into a database that has none — a second run must never duplicate rows,
and must never overwrite what the owner has edited since.

The demo set is deliberately the one the frontend was accepted against (§13.1):
four categories with one hidden, seven positions covering "with a photo",
"without a photo", "немає" and both badges, three atmosphere tiles with one
hidden. Between them they show every state the showcase knows how to render.

The photos it needs are drawn, not committed: real frames are the owner's and
arrive through the panel, while the seed only has to prove the path works and
be obviously a stand-in.
"""

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from io import BytesIO

from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.db import get_engine, get_session_factory
from faust_api.models import (
    AdminUser,
    AtmospherePhoto,
    MenuCategory,
    MenuItem,
    MenuItemBadge,
    OperatingHours,
    SiteSettings,
    SocialLink,
    Testimonial,
)
from faust_api.security.passwords import hash_password
from faust_api.services.images import ATMOSPHERE_FOLDER, MENU_FOLDER, store_photo
from faust_api.settings import ConfigurationError, get_settings

logger = logging.getLogger("faust_api.seed")


@dataclass(frozen=True)
class ItemSeed:
    name: str
    composition: str
    price: int
    volume: str
    badge: MenuItemBadge | None = None
    available: bool = True
    image_alt: str | None = None
    """Doubles as the marker for "this row has a photo": a picture without a
    description is not something this project ships (§5.2)."""


@dataclass(frozen=True)
class CategorySeed:
    slug: str
    title: str
    note: str | None = None
    visible: bool = True
    items: tuple[ItemSeed, ...] = field(default_factory=tuple)


# Rows that carry a photo get a real one: `image_alt` below is what marks them,
# and the file itself is drawn at seed time (see `placeholder`). Pointing at
# files that do not exist would leave the showcase with broken pictures rather
# than with the monogram it draws for a position that has none.
CATEGORIES: tuple[CategorySeed, ...] = (
    CategorySeed(
        slug="signature",
        title="Авторські коктейлі",
        note="подаються з 22:00",
        items=(
            ItemSeed(
                name="Faust Sour",
                composition="бурбон, лимон, яєчний білок, ангостура",
                price=320,
                volume="250 мл",
                badge=MenuItemBadge.HIT,
                image_alt="Коктейль Faust Sour у келиху купе",
            ),
            ItemSeed(
                name="Мефісто",
                composition="джин, кампарі, червоний вермут, грейпфрут",
                price=340,
                volume="200 мл",
                badge=MenuItemBadge.NEW,
            ),
            ItemSeed(
                name="Нічна зміна",
                composition="ром, еспресо, какао-лікер",
                price=300,
                volume="180 мл",
                available=False,
            ),
        ),
    ),
    CategorySeed(
        slug="classic",
        title="Класика",
        items=(
            ItemSeed(
                name="Негроні",
                composition="джин, кампарі, червоний вермут",
                price=280,
                volume="150 мл",
                image_alt="Негроні з апельсиновою цедрою у склянці рокс",
            ),
            ItemSeed(
                name="Олд фешн",
                composition="бурбон, цукор, ангостура, апельсин",
                price=290,
                volume="120 мл",
            ),
        ),
    ),
    CategorySeed(
        slug="shots",
        title="Шоти",
        items=(
            ItemSeed(
                name="Б-52",
                composition="калуа, бейліз, трипл сек",
                price=120,
                volume="60 мл",
            ),
        ),
    ),
    # Hidden: the showcase must not show it, the admin panel must.
    CategorySeed(
        slug="wine",
        title="Вино й ігристе",
        visible=False,
        items=(
            ItemSeed(
                name="Ігристе брют",
                composition="біле сухе, Італія",
                price=190,
                volume="150 мл",
            ),
        ),
    ),
)

PHOTOS: tuple[tuple[str, str, bool], ...] = (
    ("Танцпол", "Танцпол Faust під час нічного сету", True),
    ("Бар", "Барна стійка з підсвіткою й барменом за роботою", True),
    ("VIP-зона", "Кутовий диван VIP-зони з приглушеним світлом", False),
)

# The facts the frontend used to hard-code in `data/site.ts` (§13 follow-up).
# Seeded once, exactly like the demo menu — the owner's edits from the panel
# must survive every redeploy.
DEFAULT_SETTINGS = {
    "name": "Faust",
    "tagline": "Нічний клуб у серці Шепетівки",
    "description": (
        "Faust — авторські коктейлі, особлива атмосфера та ритм, який задає настрій усьому вечору."
    ),
    "phone": "+380 66 727 9143",
    "phone_href": "tel:+380667279143",
    "email": "hello@faust.bar",
    "email_href": "mailto:hello@faust.bar",
    "address": "вул. Соборності, 6а, Шепетівка, 30405",
    "address_short": "Соборності, 6а",
    "maps_url": "https://maps.google.com/?q=50.1814,27.0637",
    "maps_embed_query": "Соборності 6а, Шепетівка",
    "latitude": 50.1814,
    "longitude": 27.0637,
    "age_restriction": "16+",
}

DEFAULT_SOCIALS: tuple[tuple[str, str, str], ...] = (
    ("Instagram", "https://www.instagram.com/faust.club", "@faust.club"),
    ("TikTok", "https://www.tiktok.com/@faustrahsb4", "@faustrahsb4"),
)

DAY_LABELS: tuple[str, ...] = (
    "Понеділок",
    "Вівторок",
    "Середа",
    "Четвер",
    "П'ятниця",
    "Субота",
    "Неділя",
)

DEFAULT_HOURS: tuple[tuple[str | None, str | None, bool], ...] = (
    ("18:00", "23:30", False),  # Пн
    ("18:00", "23:30", False),  # Вт
    ("18:00", "23:30", False),  # Ср
    ("18:00", "23:30", False),  # Чт
    ("18:00", "23:30", False),  # Пт
    ("18:00", "23:30", False),  # Сб
    (None, None, False),  # Нд — вихідний
)

DEFAULT_TESTIMONIALS: tuple[tuple[str, str, str], ...] = (
    ("Найкращий звук у місті — без перебільшень.", "Софія М.", "гостя клубу"),
    (
        "Бар-команда — окрема причина повертатися. Коктейлі збалансовані, а не просто красиві на фото.",
        "Дмитро К.",
        "постійний гість",
    ),
    (
        "Забронювали віп-стіл на день народження — сервіс на рівні, персонал уважний, "
        "локація в самому центрі.",
        "Анна Т.",
        "приватна подія",
    ),
)

PLACEHOLDER_SIZE = 900
PLACEHOLDER_TOP = (13, 7, 19)
"""--ultra: the dark violet the whole site is built on."""

PLACEHOLDER_BOTTOM = (240, 85, 139)
"""--accent-magenta. A gradient between the two reads as a placeholder at a
glance — which is the point: nobody should mistake it for a photo of a drink."""


def placeholder(tilt: int) -> bytes:
    """A frame to seed with, drawn rather than committed.

    The real photos are the owner's, taken with a phone and uploaded through
    the panel. What the seed needs is something that exercises the whole path —
    magic bytes, resizing, three variants — and that is honest about being a
    stand-in. `tilt` only shifts the gradient so the tiles are told apart.
    """

    def blend(y: int) -> tuple[int, int, int]:
        weight = ((y + tilt * 60) % PLACEHOLDER_SIZE) / PLACEHOLDER_SIZE
        top, bottom = PLACEHOLDER_TOP, PLACEHOLDER_BOTTOM

        return (
            round(top[0] + (bottom[0] - top[0]) * weight),
            round(top[1] + (bottom[1] - top[1]) * weight),
            round(top[2] + (bottom[2] - top[2]) * weight),
        )

    # Drawn as a single column and stretched: a pixel loop over the whole
    # square would make seeding noticeably slow for no visible difference.
    column = Image.new("RGB", (1, PLACEHOLDER_SIZE))
    column.putdata([blend(y) for y in range(PLACEHOLDER_SIZE)])

    frame = column.resize((PLACEHOLDER_SIZE, PLACEHOLDER_SIZE))

    buffer = BytesIO()
    frame.save(buffer, format="PNG")

    return buffer.getvalue()


async def ensure_admin(session: AsyncSession) -> bool:
    """Writes the first administrator. Returns whether a row was actually added."""
    settings = get_settings()

    if settings.seed_admin_email is None or settings.seed_admin_password is None:
        raise ConfigurationError(
            "Не налаштовані SEED_ADMIN_EMAIL і SEED_ADMIN_PASSWORD.\n"
            "Без них немає з чим заходити в адмінку — заповніть їх у api/.env."
        )

    email = settings.seed_admin_email.strip().lower()
    existing = await session.scalar(select(AdminUser).where(AdminUser.email == email))

    if existing is not None:
        logger.info("[seed] адміністратор %s уже є — пропускаю", email)
        return False

    session.add(
        AdminUser(
            email=email,
            # The plain value never touches the database, the log or this file.
            password_hash=hash_password(settings.seed_admin_password.get_secret_value()),
            name="Власник",
        )
    )
    logger.info("[seed] додано адміністратора %s", email)

    return True


async def ensure_menu(session: AsyncSession) -> bool:
    """Writes the demo bar card, but only into a database that has no categories."""
    count = await session.scalar(select(func.count()).select_from(MenuCategory))

    if count:
        logger.info("[seed] у базі вже %s категорій — меню не чіпаю", count)
        return False

    for category_order, category in enumerate(CATEGORIES, start=1):
        row = MenuCategory(
            slug=category.slug,
            title=category.title,
            note=category.note,
            order=category_order,
            visible=category.visible,
        )
        items: list[MenuItem] = []

        for item_order, item in enumerate(category.items, start=1):
            # Minted here rather than by the database: the files are stored
            # under the id of the row that owns them, so it has to exist first.
            item_id = uuid.uuid4()

            items.append(
                MenuItem(
                    id=item_id,
                    name=item.name,
                    composition=item.composition,
                    price=item.price,
                    volume=item.volume,
                    badge=item.badge,
                    available=item.available,
                    image_key=(
                        await store_photo(MENU_FOLDER, item_id, placeholder(item_order))
                        if item.image_alt
                        else None
                    ),
                    image_alt=item.image_alt,
                    order=item_order,
                )
            )

        row.items = items
        session.add(row)

    logger.info("[seed] додано %s категорій меню", len(CATEGORIES))

    return True


async def ensure_atmosphere(session: AsyncSession) -> bool:
    count = await session.scalar(select(func.count()).select_from(AtmospherePhoto))

    if count:
        logger.info("[seed] у базі вже %s фото атмосфери — не чіпаю", count)
        return False

    for order, (label, image_alt, visible) in enumerate(PHOTOS, start=1):
        photo_id = uuid.uuid4()

        session.add(
            AtmospherePhoto(
                id=photo_id,
                label=label,
                image_key=await store_photo(ATMOSPHERE_FOLDER, photo_id, placeholder(order + 3)),
                image_alt=image_alt,
                order=order,
                visible=visible,
            )
        )

    logger.info("[seed] додано %s плиток атмосфери", len(PHOTOS))

    return True


async def ensure_settings(session: AsyncSession) -> bool:
    """Writes the club's own facts, but only into a database that has none."""
    count = await session.scalar(select(func.count()).select_from(SiteSettings))

    if count:
        logger.info("[seed] налаштування сайту вже є — не чіпаю")
        return False

    session.add(SiteSettings(**DEFAULT_SETTINGS))
    logger.info("[seed] додано налаштування сайту")

    return True


async def ensure_socials(session: AsyncSession) -> bool:
    count = await session.scalar(select(func.count()).select_from(SocialLink))

    if count:
        logger.info("[seed] у базі вже %s соцмереж — не чіпаю", count)
        return False

    for order, (name, href, handle) in enumerate(DEFAULT_SOCIALS, start=1):
        session.add(SocialLink(name=name, href=href, handle=handle, order=order))

    logger.info("[seed] додано %s соцмереж", len(DEFAULT_SOCIALS))

    return True


async def ensure_hours(session: AsyncSession) -> bool:
    """All seven days at once — a partial week is not a state this table allows."""
    count = await session.scalar(select(func.count()).select_from(OperatingHours))

    if count:
        logger.info("[seed] графік роботи вже є — не чіпаю")
        return False

    for day, (label, (open_, close_, closes_next_day)) in enumerate(
        zip(DAY_LABELS, DEFAULT_HOURS, strict=True), start=1
    ):
        session.add(
            OperatingHours(day=day, label=label, open=open_, close=close_, closes_next_day=closes_next_day)
        )

    logger.info("[seed] додано графік роботи на всі 7 днів")

    return True


async def ensure_testimonials(session: AsyncSession) -> bool:
    count = await session.scalar(select(func.count()).select_from(Testimonial))

    if count:
        logger.info("[seed] у базі вже %s відгуків — не чіпаю", count)
        return False

    for order, (text, name, meta) in enumerate(DEFAULT_TESTIMONIALS, start=1):
        session.add(Testimonial(text=text, name=name, meta=meta, order=order, visible=True))

    logger.info("[seed] додано %s відгуків", len(DEFAULT_TESTIMONIALS))

    return True


async def seed(session: AsyncSession) -> None:
    await ensure_admin(session)
    await ensure_menu(session)
    await ensure_atmosphere(session)
    await ensure_settings(session)
    await ensure_socials(session)
    await ensure_hours(session)
    await ensure_testimonials(session)
    await session.commit()


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    factory = get_session_factory()

    async with factory() as session:
        await seed(session)

    await get_engine().dispose()
    logger.info("[seed] готово")


if __name__ == "__main__":
    asyncio.run(main())