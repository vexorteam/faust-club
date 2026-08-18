"""Sections of the bar card: create, rename, hide, reorder, delete (§5.3.1).

Two rules of this router are worth stating out loud, because both of them are
about not losing the owner's work:

  * a category that still holds positions is not deleted — 409, and the panel
    explains which ones and how many;
  * `slug` is the #anchor of /menu, so a duplicate is refused with the field
    named, not silently suffixed.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.db import get_session
from faust_api.errors import CategoryNotEmptyError, NotFoundError, SlugConflictError
from faust_api.models import MenuCategory, MenuItem
from faust_api.schemas.admin import (
    Acknowledged,
    AdminCategory,
    CategoriesResponse,
    CategoryCreate,
    CategoryPatch,
    CategoryResponse,
    MoveRequest,
    changes_of,
)
from faust_api.services.ordering import append, close_gap, move
from faust_api.services.revalidate import request_revalidation

router = APIRouter(prefix="/categories")

Session = Annotated[AsyncSession, Depends(get_session)]

MISSING_MESSAGE = "Категорію не знайдено. Можливо, її щойно видалили"


async def load_category(session: AsyncSession, category_id: uuid.UUID) -> MenuCategory:
    """The category or a 404 — never a silent `None` further down the handler."""
    category = await session.get(MenuCategory, category_id)

    if category is None:
        raise NotFoundError(MISSING_MESSAGE)

    return category


async def count_items(session: AsyncSession, category_id: uuid.UUID) -> int:
    total = await session.scalar(
        select(func.count()).select_from(MenuItem).where(MenuItem.category_id == category_id)
    )

    return int(total or 0)


async def claim_slug(session: AsyncSession, slug: str, *, taken_by: uuid.UUID | None = None) -> None:
    """Refuses a duplicate before the database has to.

    The unique index is the real guarantee; this check exists so the answer
    names the field instead of arriving as a 500 from a constraint.
    """
    query = select(MenuCategory.id).where(MenuCategory.slug == slug)

    if taken_by is not None:
        query = query.where(MenuCategory.id != taken_by)

    if await session.scalar(query) is not None:
        raise SlugConflictError.for_slug(slug)


async def commit(session: AsyncSession, slug: str) -> None:
    """Commits, translating the one race the pre-check cannot win."""
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise SlugConflictError.for_slug(slug) from None


@router.get("", response_model=CategoriesResponse)
async def read_categories(session: Session) -> CategoriesResponse:
    """All of them, hidden included, with the count the panel shows next to each.

    The counts come from one grouped subquery rather than a query per category:
    this list is the first thing the owner sees after signing in.
    """
    counts = (
        select(MenuItem.category_id, func.count().label("items_count"))
        .group_by(MenuItem.category_id)
        .subquery()
    )

    rows = await session.execute(
        select(MenuCategory, func.coalesce(counts.c.items_count, 0))
        .outerjoin(counts, counts.c.category_id == MenuCategory.id)
        .order_by(MenuCategory.order)
    )

    return CategoriesResponse(
        categories=[AdminCategory.of(category, count) for category, count in rows.all()]
    )


@router.post("", response_model=CategoryResponse)
async def create_category(
    payload: CategoryCreate, session: Session, revalidation: BackgroundTasks
) -> CategoryResponse:
    await claim_slug(session, payload.slug)

    category = MenuCategory(
        slug=payload.slug,
        title=payload.label,
        note=payload.note,
        visible=payload.visible,
        order=await append(session, MenuCategory),
    )

    session.add(category)
    await commit(session, payload.slug)

    revalidation.add_task(request_revalidation, "menu")

    return CategoryResponse(category=AdminCategory.of(category, 0))


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: uuid.UUID, payload: CategoryPatch, session: Session, revalidation: BackgroundTasks
) -> CategoryResponse:
    changes = changes_of(payload)
    category = await load_category(session, category_id)

    if "slug" in changes:
        await claim_slug(session, changes["slug"], taken_by=category.id)

    for name, value in changes.items():
        # `label` is `title` in the database — the rename of §5.3, kept in one place.
        setattr(category, "title" if name == "label" else name, value)

    await commit(session, category.slug)

    revalidation.add_task(request_revalidation, "menu")

    return CategoryResponse(category=AdminCategory.of(category, await count_items(session, category.id)))


@router.delete("/{category_id}", response_model=Acknowledged)
async def delete_category(
    category_id: uuid.UUID, session: Session, revalidation: BackgroundTasks
) -> Acknowledged:
    """A category full of positions is refused — losing half the bar card to one
    misclick is not a thing this endpoint is allowed to do (§5.2)."""
    category = await load_category(session, category_id)

    if await count_items(session, category.id) > 0:
        raise CategoryNotEmptyError()

    await session.delete(category)
    await close_gap(session, MenuCategory, category.order)
    await session.commit()

    revalidation.add_task(request_revalidation, "menu")

    return Acknowledged()


@router.post("/{category_id}/move", response_model=Acknowledged)
async def move_category(
    category_id: uuid.UUID, payload: MoveRequest, session: Session, revalidation: BackgroundTasks
) -> Acknowledged:
    """At the edge of the list nothing happens, and that is still a 200 (§5.3.1)."""
    category = await load_category(session, category_id)

    if await move(session, category, payload.direction):
        await session.commit()
        revalidation.add_task(request_revalidation, "menu")

    return Acknowledged()
