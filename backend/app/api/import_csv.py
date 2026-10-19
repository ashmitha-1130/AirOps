import io
import csv
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.resource import Resource
from app.models.staff import Staff
from app.models.task import Task
from app.models.audit import AuditLog

router = APIRouter(prefix="/import", tags=["import"])

RESOURCE_COLS = {"resource_id", "name", "resource_type", "capacity", "availability_status", "maintenance_status"}
STAFF_COLS = {"staff_id", "name", "role", "skill_category", "availability_status"}
TASK_COLS = {"task_id", "title", "category", "duration_minutes", "priority", "earliest_start", "deadline", "required_resource_type"}

VALID_AVAIL = {"available", "unavailable", "maintenance"}
VALID_MAINT = {"operational", "under_maintenance", "scheduled_maintenance"}
VALID_CATEGORIES = {"training", "routine_transportation", "maintenance_coordination", "general_logistics"}


def _parse_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


@router.post("/csv/{entity_type}")
async def import_csv(entity_type: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if entity_type not in ("resources", "staff", "tasks"):
        raise HTTPException(400, "entity_type must be resources, staff, or tasks")

    content = await file.read()
    try:
        rows = _parse_csv(content)
    except Exception as e:
        raise HTTPException(400, f"CSV parse error: {e}")

    if not rows:
        raise HTTPException(400, "CSV file is empty")

    headers = set(rows[0].keys())
    required = {"resources": RESOURCE_COLS, "staff": STAFF_COLS, "tasks": TASK_COLS}[entity_type]
    missing_cols = required - headers
    if missing_cols:
        raise HTTPException(400, f"Missing required columns: {missing_cols}")

    errors = []
    imported = 0
    skipped = 0

    for i, row in enumerate(rows, 1):
        row_errors = []

        if entity_type == "resources":
            rid = row.get("resource_id", "").strip()
            if not rid:
                row_errors.append("resource_id is empty")
            elif db.query(Resource).filter_by(resource_id=rid).first():
                skipped += 1
                continue
            avail = row.get("availability_status", "").strip()
            if avail not in VALID_AVAIL:
                row_errors.append(f"Invalid availability_status: {avail}")
            maint = row.get("maintenance_status", "").strip()
            if maint not in VALID_MAINT:
                row_errors.append(f"Invalid maintenance_status: {maint}")
            try:
                cap = int(row.get("capacity", 1))
            except ValueError:
                row_errors.append("capacity must be integer")
                cap = 1
            if not row_errors:
                db.add(Resource(
                    resource_id=rid, name=row["name"].strip(),
                    resource_type=row["resource_type"].strip(), capacity=cap,
                    availability_status=avail, maintenance_status=maint,
                    availability_notes=row.get("availability_notes", "").strip() or None,
                ))
                imported += 1

        elif entity_type == "staff":
            sid = row.get("staff_id", "").strip()
            if not sid:
                row_errors.append("staff_id is empty")
            elif db.query(Staff).filter_by(staff_id=sid).first():
                skipped += 1
                continue
            avail = row.get("availability_status", "").strip()
            if avail not in VALID_AVAIL:
                row_errors.append(f"Invalid availability_status: {avail}")
            if not row_errors:
                db.add(Staff(
                    staff_id=sid, name=row["name"].strip(),
                    role=row["role"].strip(), skill_category=row["skill_category"].strip(),
                    availability_status=avail,
                    availability_notes=row.get("availability_notes", "").strip() or None,
                ))
                imported += 1

        elif entity_type == "tasks":
            tid = row.get("task_id", "").strip()
            if not tid:
                row_errors.append("task_id is empty")
            elif db.query(Task).filter_by(task_id=tid).first():
                skipped += 1
                continue
            cat = row.get("category", "").strip()
            if cat not in VALID_CATEGORIES:
                row_errors.append(f"Invalid category: {cat}")
            try:
                dur = int(row.get("duration_minutes", 0))
            except ValueError:
                row_errors.append("duration_minutes must be integer")
                dur = 0
            try:
                pri = int(row.get("priority", 3))
            except ValueError:
                row_errors.append("priority must be integer")
                pri = 3
            try:
                es = datetime.fromisoformat(row["earliest_start"])
                if es.tzinfo is None:
                    es = es.replace(tzinfo=timezone.utc)
            except Exception:
                row_errors.append("Invalid earliest_start datetime")
                es = None
            try:
                dl = datetime.fromisoformat(row["deadline"])
                if dl.tzinfo is None:
                    dl = dl.replace(tzinfo=timezone.utc)
            except Exception:
                row_errors.append("Invalid deadline datetime")
                dl = None
            if not row_errors:
                db.add(Task(
                    task_id=tid, title=row["title"].strip(), category=cat,
                    description=row.get("description", "").strip() or None,
                    duration_minutes=dur, priority=pri,
                    earliest_start=es, deadline=dl,
                    required_resource_type=row["required_resource_type"].strip(),
                    required_skill=row.get("required_skill", "").strip() or None,
                ))
                imported += 1

        if row_errors:
            errors.append({"row": i, "errors": row_errors})

    if errors:
        db.rollback()
        return {"status": "error", "imported": 0, "skipped": skipped, "errors": errors}

    db.add(AuditLog(
        event_type="CSV_IMPORT",
        entity_type=entity_type,
        entity_id="bulk",
        actor="user",
        description=f"CSV import: {imported} {entity_type} imported, {skipped} skipped",
    ))
    db.commit()
    return {"status": "success", "imported": imported, "skipped": skipped, "errors": []}
