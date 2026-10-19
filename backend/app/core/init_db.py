"""Database initialisation and seed data loader."""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.database import Base, engine, SessionLocal
from app.models.resource import Resource
from app.models.staff import Staff
from app.models.task import Task
from app.models.constraint import Constraint
from app.models.audit import AuditLog
from app.core.seed_data import RESOURCES, STAFF, TASKS, CONSTRAINTS


def init_db():
    Base.metadata.create_all(bind=engine)


def load_seed_data(db: Session) -> dict:
    counts = {"resources": 0, "staff": 0, "tasks": 0, "constraints": 0}

    for r in RESOURCES:
        if not db.query(Resource).filter_by(resource_id=r["resource_id"]).first():
            db.add(Resource(**r))
            counts["resources"] += 1

    for s in STAFF:
        if not db.query(Staff).filter_by(staff_id=s["staff_id"]).first():
            db.add(Staff(**s))
            counts["staff"] += 1

    for t in TASKS:
        if not db.query(Task).filter_by(task_id=t["task_id"]).first():
            data = dict(t)
            for field in ("earliest_start", "deadline"):
                if isinstance(data[field], str):
                    data[field] = datetime.fromisoformat(data[field])
            db.add(Task(**data))
            counts["tasks"] += 1

    for c in CONSTRAINTS:
        if not db.query(Constraint).filter_by(constraint_id=c["constraint_id"]).first():
            data = dict(c)
            for field in ("start_time", "end_time"):
                if isinstance(data[field], str):
                    data[field] = datetime.fromisoformat(data[field])
            db.add(Constraint(**data))
            counts["constraints"] += 1

    db.add(AuditLog(
        event_type="SEED_DATA_LOADED",
        entity_type="system",
        entity_id="system",
        actor="system",
        description=f"Demo seed data loaded: {counts}",
    ))
    db.commit()
    return counts
