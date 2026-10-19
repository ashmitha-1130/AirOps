from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class ResourceBase(BaseModel):
    resource_id: str
    name: str
    resource_type: str
    capacity: int = 1
    availability_status: str = "available"
    maintenance_status: str = "operational"
    availability_notes: Optional[str] = None

class ResourceCreate(ResourceBase):
    pass

class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    resource_type: Optional[str] = None
    capacity: Optional[int] = None
    availability_status: Optional[str] = None
    maintenance_status: Optional[str] = None
    availability_notes: Optional[str] = None
    is_active: Optional[bool] = None

class ResourceOut(ResourceBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
