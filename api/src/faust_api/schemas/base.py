"""What every response model shares: camelCase on the wire, snake_case in Python.

The database speaks `image_alt`, the contract speaks `imageAlt`. Translating it
once here beats writing an alias on every field and forgetting one.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
