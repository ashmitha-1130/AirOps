from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class ConstraintBase(BaseModel):
    constraint_id: str
    constraint_type: str
    entity_type: str
    entity_id: str
    start_time: datetime
    end_time: datetime
    reason: Optional[str] = None

class ConstraintCreate(ConstraintBase):
    pass

class ConstraintOut(ConstraintBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
