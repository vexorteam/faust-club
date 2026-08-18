"""The four entities of §5.2.

Importing this package is what makes `Base.metadata` complete, so both Alembic
and the tests import it rather than the individual modules.
"""

from faust_api.models.admin_user import AdminUser
from faust_api.models.atmosphere import AtmospherePhoto
from faust_api.models.base import Base
from faust_api.models.category import MenuCategory
from faust_api.models.item import MenuItem, MenuItemBadge

__all__ = [
    "AdminUser",
    "AtmospherePhoto",
    "Base",
    "MenuCategory",
    "MenuItem",
    "MenuItemBadge",
]
