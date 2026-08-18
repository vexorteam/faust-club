"""Positions of the bar card (§5.3.1).

The endpoint the panel opens on is `GET /admin/items`: everything at once,
grouped by category, hidden categories included, both levels already sorted.
The owner has forty-odd positions, so one answer is cheaper than a request per
section — and it is what lets the search box in the panel work without asking
the API anything.

`PATCH` carries the one operation that looks small and is not: changing
`categoryId` moves a position to another section. It leaves the old list
contiguous and lands at the end of the new one.
"""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from faust_api.db import get_session
from faust_api.errors import NotFoundError
from faust_api.models import MenuCategory, MenuItem
from faust_api.routers.admin.categories import load_category
from faust_api.schemas.admin import (
    Acknowledged,
    AdminMenuItem,
    ItemCreate,
    ItemGroup,
    ItemPatch,
    ItemResponse,
    ItemsResponse,
    MoveRequest,
    changes_of,
)
from faust_api.services.ordering import append, close_gap, move
from faust_api.services.revalidate import request_revalidation

router = APIRouter(prefix="/items")

Session = Annotated[AsyncSession, Depends(get_session)]

MISSING_MESSAGE = "Позицію не знайдено. Можливо, її щойно видалили"

COLUMNS: dict[str, str] = {"description": "composition"}
"""Contract name → column name. Only one field differs, and it differs on the
public side too, so the showcase and the panel read the same word."""


async def load_item(session: AsyncSession, item_id: uuid.UUID) -> MenuItem:
    item = await session.get(MenuItem, item_id)

    if item is None:
        raise NotFoundError(MISSING_MESSAGE)

    return item


def within_category(category_id: uuid.UUID) -> Any:
    """Two positions are neighbours only inside their own category (§5.3.1)."""
    return MenuItem.category_id == category_id


@router.get("", response_model=ItemsResponse)
async def read_items(
    session: Session, category: Annotated[uuid.UUID | None, Query()] = None
) -> ItemsResponse:
    """Grouped by category — the shape the list page renders directly.

    `selectinload` keeps this at two queries no matter how many sections the
    menu grows to; the relationship carries the `order` sort, so neither level
    is sorted a second time here.
    """
    query = select(MenuCategory).order_by(MenuCategory.order).options(selectinload(MenuCategory.items))

    if category is not None:
        query = query.where(MenuCategory.id == category)

    groups = await session.scalars(query)

    return ItemsResponse(categories=[ItemGroup.of(group) for group in groups])


@router.get("/{item_id}", response_model=ItemResponse)
async def read_item(item_id: uuid.UUID, session: Session) -> ItemResponse:
    """One position, for the edit form."""
    return ItemResponse(item=AdminMenuItem.of(await load_item(session, item_id)))


@router.post("", response_model=ItemResponse)
async def create_item(payload: ItemCreate, session: Session, revalidation: BackgroundTasks) -> ItemResponse:
    category = await load_category(session, payload.category_id)

    item = MenuItem(
        category_id=category.id,
        name=payload.name,
        composition=payload.description,
        price=payload.price,
        volume=payload.volume,
        badge=payload.badge,
        available=payload.available,
        order=await append(session, MenuItem, within_category(category.id)),
    )

    session.add(item)
    await session.commit()

    revalidation.add_task(request_revalidation, "menu")

    return ItemResponse(item=AdminMenuItem.of(item))


async def relocate(session: AsyncSession, item: MenuItem, category_id: uuid.UUID) -> None:
    """Moves a position to another category without leaving a hole behind.

    The new number is taken before the position is reassigned — otherwise the
    query counting the new category would already see it there and hand back a
    number one too high.
    """
    await load_category(session, category_id)

    vacated_category, vacated_order = item.category_id, item.order

    item.order = await append(session, MenuItem, within_category(category_id))
    item.category_id = category_id

    await close_gap(session, MenuItem, vacated_order, within_category(vacated_category))


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: uuid.UUID, payload: ItemPatch, session: Session, revalidation: BackgroundTasks
) -> ItemResponse:
    changes = changes_of(payload)
    item = await load_item(session, item_id)

    target = changes.pop("category_id", None)

    if target is not None and target != item.category_id:
        await relocate(session, item, target)

    for name, value in changes.items():
        setattr(item, COLUMNS.get(name, name), value)

    await session.commit()

    revalidation.add_task(request_revalidation, "menu")

    return ItemResponse(item=AdminMenuItem.of(item))


@router.delete("/{item_id}", response_model=Acknowledged)
async def delete_item(item_id: uuid.UUID, session: Session, revalidation: BackgroundTasks) -> Acknowledged:
    """Removing a position closes the gap it leaves in its category's order.

    Its photo files go with it — that part arrives in Б6, together with the
    storage that holds them.
    """
    item = await load_item(session, item_id)
    category_id, vacated = item.category_id, item.order

    await session.delete(item)
    await close_gap(session, MenuItem, vacated, within_category(category_id))
    await session.commit()

    revalidation.add_task(request_revalidation, "menu")

    return Acknowledged()


@router.post("/{item_id}/move", response_model=Acknowledged)
async def move_item(
    item_id: uuid.UUID, payload: MoveRequest, session: Session, revalidation: BackgroundTasks
) -> Acknowledged:
    item = await load_item(session, item_id)

    if await move(session, item, payload.direction, within_category(item.category_id)):
        await session.commit()
        revalidation.add_task(request_revalidation, "menu")

    return Acknowledged()
