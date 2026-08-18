"""`services/ordering.py` — the invariant three entities share.

Inside one list the numbers are 1..n, contiguous and unique. Nothing in the
database enforces that (the column has no unique constraint on purpose), so it
is enforced here — and these tests are the only thing standing between the
owner and a menu whose ↑↓ buttons stop making sense.

Real Postgres, because `close_gap` is one UPDATE and the point is that it
touches exactly the rows it should.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import MenuCategory, MenuItem
from faust_api.services.ordering import append, close_gap, move


async def make_category(session: AsyncSession, slug: str, order: int) -> MenuCategory:
    category = MenuCategory(slug=slug, title=slug.title(), order=order)

    session.add(category)
    await session.commit()

    return category


async def make_item(session: AsyncSession, category: MenuCategory, name: str, order: int) -> MenuItem:
    item = MenuItem(category_id=category.id, name=name, price=100, order=order)

    session.add(item)
    await session.commit()

    return item


async def orders(session: AsyncSession, category_id: uuid.UUID) -> list[tuple[str, int]]:
    rows = await session.scalars(
        select(MenuItem).where(MenuItem.category_id == category_id).order_by(MenuItem.order)
    )

    return [(item.name, item.order) for item in rows]


async def test_the_first_row_of_an_empty_list_is_numbered_one(session: AsyncSession) -> None:
    assert await append(session, MenuCategory) == 1


async def test_a_new_row_goes_to_the_end(session: AsyncSession) -> None:
    await make_category(session, "signature", 1)
    await make_category(session, "classic", 2)

    assert await append(session, MenuCategory) == 3


async def test_the_end_of_the_list_is_counted_within_the_scope(session: AsyncSession) -> None:
    """A crowded category must not push the first position of an empty one to 4."""
    crowded = await make_category(session, "signature", 1)
    empty = await make_category(session, "shots", 2)

    for index, name in enumerate(("Faust Sour", "Negroni", "Old Fashioned"), start=1):
        await make_item(session, crowded, name, index)

    assert await append(session, MenuItem, MenuItem.category_id == empty.id) == 1


async def test_moving_up_at_the_top_moves_nothing(session: AsyncSession) -> None:
    """The owner pressed ↑ on the first row. That is not a mistake — it is a no-op."""
    first = await make_category(session, "signature", 1)
    await make_category(session, "classic", 2)

    assert await move(session, first, "up") is False
    assert first.order == 1


async def test_moving_down_at_the_bottom_moves_nothing(session: AsyncSession) -> None:
    await make_category(session, "signature", 1)
    last = await make_category(session, "classic", 2)

    assert await move(session, last, "down") is False
    assert last.order == 2


async def test_moving_swaps_places_with_the_neighbour(session: AsyncSession) -> None:
    first = await make_category(session, "signature", 1)
    second = await make_category(session, "classic", 2)

    assert await move(session, first, "down") is True
    assert (first.order, second.order) == (2, 1)


async def test_a_position_has_no_neighbours_in_another_category(session: AsyncSession) -> None:
    """Positions are rearranged inside their own section (§5.3.1)."""
    signature = await make_category(session, "signature", 1)
    shots = await make_category(session, "shots", 2)

    alone = await make_item(session, signature, "Faust Sour", 1)
    await make_item(session, shots, "Б-52", 1)
    await make_item(session, shots, "Текіла бум", 2)

    assert await move(session, alone, "down", MenuItem.category_id == signature.id) is False
    assert alone.order == 1


async def test_closing_the_gap_pulls_the_tail_up(session: AsyncSession) -> None:
    """1, 2, 4, 5 becomes 1, 2, 3, 4 — a list nobody has to reason about."""
    signature = await make_category(session, "signature", 1)

    for index, name in enumerate(("перша", "друга", "третя", "четверта"), start=1):
        await make_item(session, signature, name, index)

    third = await session.scalar(select(MenuItem).where(MenuItem.name == "третя"))
    assert third is not None

    await session.delete(third)
    await close_gap(session, MenuItem, third.order, MenuItem.category_id == signature.id)
    await session.commit()

    assert await orders(session, signature.id) == [("перша", 1), ("друга", 2), ("четверта", 3)]


async def test_closing_a_gap_leaves_the_other_category_alone(session: AsyncSession) -> None:
    signature = await make_category(session, "signature", 1)
    shots = await make_category(session, "shots", 2)

    await make_item(session, signature, "перша", 1)
    await make_item(session, signature, "друга", 2)
    await make_item(session, shots, "шот", 1)
    await make_item(session, shots, "другий шот", 2)

    await close_gap(session, MenuItem, 1, MenuItem.category_id == signature.id)
    await session.commit()

    assert await orders(session, shots.id) == [("шот", 1), ("другий шот", 2)]
