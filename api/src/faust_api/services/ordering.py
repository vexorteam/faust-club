"""`order` — one implementation for the three entities that have one.

Categories, positions and atmosphere tiles all keep a 1-based `order` and are
all rearranged by the same two buttons in the admin panel (§6.6). The column
has no unique constraint on purpose (Б2): swapping two rows would otherwise
need a temporary value, and the invariant is easier to keep here than in three
handlers that drifted apart.

The invariant: inside one list the numbers are 1..n, contiguous, no repeats.
`append` puts a new row at the end, `move` swaps it with a neighbour, and
`close_gap` pulls the tail up after a row leaves the list — by being deleted or
by moving to another category.

"Scope" is what makes two rows neighbours: nothing for categories and tiles,
`category_id` for positions.
"""

from typing import Literal

from sqlalchemy import ColumnElement, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import AtmospherePhoto, MenuCategory, MenuItem, SocialLink, Testimonial

Direction = Literal["up", "down"]

type Ordered = MenuCategory | MenuItem | AtmospherePhoto | SocialLink | Testimonial
"""The entities that keep a hand-arranged order."""

FIRST_ORDER = 1


async def append[Row: Ordered](session: AsyncSession, model: type[Row], *scope: ColumnElement[bool]) -> int:
    """The number a row added right now should get: last in its list."""
    highest: int | None = await session.scalar(select(func.max(model.order)).where(*scope))

    return FIRST_ORDER if highest is None else highest + 1


async def move[Row: Ordered](
    session: AsyncSession, row: Row, direction: Direction, *scope: ColumnElement[bool]
) -> bool:
    """Swaps places with the nearest neighbour in the given direction.

    At the edge of the list there is no neighbour, and that is not a mistake —
    the owner pressed ↑ on the first row. Returns whether anything moved; the
    handler answers 200 either way (§5.3.1).
    """
    model = type(row)

    if direction == "up":
        side = model.order < row.order
        nearest = model.order.desc()
    else:
        side = model.order > row.order
        nearest = model.order.asc()

    neighbour = await session.scalar(select(model).where(*scope, side).order_by(nearest).limit(1))

    if neighbour is None:
        return False

    row.order, neighbour.order = neighbour.order, row.order
    await session.flush()

    return True


async def close_gap[Row: Ordered](
    session: AsyncSession, model: type[Row], vacated: int, *scope: ColumnElement[bool]
) -> None:
    """Pulls the tail of the list up one, so 1, 2, 4, 5 becomes 1, 2, 3, 4.

    Without it the numbers would still sort correctly, but they would drift
    apart forever, and a list whose order reads 1, 7, 42 is a list nobody can
    reason about when something goes wrong.
    """
    await session.execute(update(model).where(*scope, model.order > vacated).values(order=model.order - 1))