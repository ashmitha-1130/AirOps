from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class StaffBase(BaseModel):
    staff_id: str
    name: str
    role: str
    skill_category: str
    availability_status: str = "available"
    availability_notes: Optional[str] = None

class StaffCreate(StaffBase):
    pass

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    skill_category: Optional[str] = None
    availability_status: Optional[str] = None
    availability_notes: Optional[str] = None
    is_active: Optional[bool] = None

class StaffOut(StaffBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
