import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.models.resource import Resource
from app.models.staff import Staff
from app.models.constraint import Constraint
from app.models.audit import AuditLog
from app.schemas.schedule import ScheduleGenerateRequest
from app.api.schedules import generate_schedule
from app.utils.timezone import IST

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


class ScenarioRequest(BaseModel):
    description: str
    resource_unavailable: Optional[str] = None
    staff_unavailable: Optional[str] = None
    maintenance_window: Optional[dict] = None
    parent_schedule_id: Optional[str] = None


@router.post("")
def run_scenario(req: ScenarioRequest, db: Session = Depends(get_db)):
    changes = []

    if req.resource_unavailable:
        r = db.query(Resource).filter_by(resource_id=req.resource_unavailable).first()
        if not r:
            raise HTTPException(404, f"Resource {req.resource_unavailable} not found")
        r.availability_status = "unavailable"
        changes.append(f"Resource {req.resource_unavailable} marked unavailable")
        db.add(AuditLog(
            event_type="SCENARIO_RESOURCE_UNAVAILABLE",
            entity_type="resource",
            entity_id=req.resource_unavailable,
            actor="user",
            description=f"Scenario: {req.resource_unavailable} marked unavailable. {req.description}",
        ))

    if req.staff_unavailable:
        s = db.query(Staff).filter_by(staff_id=req.staff_unavailable).first()
        if not s:
            raise HTTPException(404, f"Staff {req.staff_unavailable} not found")
        s.availability_status = "unavailable"
        changes.append(f"Staff {req.staff_unavailable} marked unavailable")
        db.add(AuditLog(
            event_type="SCENARIO_STAFF_UNAVAILABLE",
            entity_type="staff",
            entity_id=req.staff_unavailable,
            actor="user",
            description=f"Scenario: {req.staff_unavailable} marked unavailable. {req.description}",
        ))

    if req.maintenance_window:
        mw = req.maintenance_window
        cid = f"CON-SIM-{uuid.uuid4().hex[:6].upper()}"
        try:
            st = datetime.fromisoformat(mw["start_time"])
            et = datetime.fromisoformat(mw["end_time"])
            if st.tzinfo is None:
                st = st.replace(tzinfo=IST)
            if et.tzinfo is None:
                et = et.replace(tzinfo=IST)
        except Exception as e:
            raise HTTPException(400, f"Invalid maintenance window times: {e}")
        c = Constraint(
            constraint_id=cid,
            constraint_type="maintenance_window",
            entity_type=mw.get("entity_type", "resource"),
            entity_id=mw.get("entity_id", ""),
            start_time=st,
            end_time=et,
            reason=mw.get("reason", req.description),
        )
        db.add(c)
        changes.append(f"Maintenance window {cid} added for {mw.get('entity_id')}")

    db.commit()

    # Generate new schedule
    gen_req = ScheduleGenerateRequest(
        scenario_description=req.description + " | Changes: " + "; ".join(changes),
        parent_schedule_id=req.parent_schedule_id,
    )
    new_schedule = generate_schedule(gen_req, db)

    return {
        "changes_applied": changes,
        "new_schedule": new_schedule,
    }
