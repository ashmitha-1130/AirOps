from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List

class AssignmentOut(BaseModel):
    id: int
    task_id: str
    resource_id: Optional[str]
    staff_id: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    is_scheduled: bool
    unscheduled_reason: Optional[str]
    explanation: Optional[str]
    model_config = {"from_attributes": True}

class ScheduleRunOut(BaseModel):
    id: int
    schedule_id: str
    version: int
    status: str
    solver_status: str
    objective_score: Optional[float]
    runtime_seconds: Optional[float]
    total_tasks: int
    scheduled_tasks: int
    unscheduled_tasks: int
    scenario_description: Optional[str]
    parent_schedule_id: Optional[str]
    reviewer_id: Optional[str]
    review_notes: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    assignments: List[AssignmentOut] = []
    model_config = {"from_attributes": True}

class ScheduleGenerateRequest(BaseModel):
    scenario_description: Optional[str] = None
    parent_schedule_id: Optional[str] = None
    time_limit_seconds: int = 30

class ApproveRequest(BaseModel):
    reviewer_id: str

class RejectRequest(BaseModel):
    reviewer_id: str
    reason: str
