from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class AuditLogOut(BaseModel):
    id: int
    event_type: str
    entity_type: str
    entity_id: str
    actor: str
    description: str
    metadata_json: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}
