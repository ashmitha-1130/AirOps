from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class TaskBase(BaseModel):
    task_id: str
    title: str
    category: str
    description: Optional[str] = None
    duration_minutes: int
    priority: int = 3
    earliest_start: datetime
    deadline: datetime
    required_resource_type: str
    required_skill: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    priority: Optional[int] = None
    earliest_start: Optional[datetime] = None
    deadline: Optional[datetime] = None
    required_resource_type: Optional[str] = None
    required_skill: Optional[str] = None
    scheduling_status: Optional[str] = None
    is_active: Optional[bool] = None

class TaskOut(TaskBase):
    id: int
    scheduling_status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
