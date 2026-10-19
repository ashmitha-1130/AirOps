from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.resource import Resource
from app.models.staff import Staff
from app.models.task import Task
from app.models.schedule import ScheduleRun
from app.models.audit import AuditLog

router = APIRouter(tags=["dashboard"])

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    total_resources = db.query(Resource).filter(Resource.is_active == True).count()
    available_resources = db.query(Resource).filter(Resource.is_active == True, Resource.availability_status == "available").count()
    maintenance_resources = db.query(Resource).filter(Resource.is_active == True, Resource.maintenance_status == "under_maintenance").count()

    total_tasks = db.query(Task).filter(Task.is_active == True).count()
    scheduled_tasks = db.query(Task).filter(Task.is_active == True, Task.scheduling_status == "scheduled").count()
    unscheduled_tasks = db.query(Task).filter(Task.is_active == True, Task.scheduling_status == "unscheduled").count()

    total_staff = db.query(Staff).filter(Staff.is_active == True).count()
    available_staff = db.query(Staff).filter(Staff.is_active == True, Staff.availability_status == "available").count()

    latest_schedule = db.query(ScheduleRun).order_by(ScheduleRun.created_at.desc()).first()

    recent_events = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()

    # Resource utilisation by type
    from sqlalchemy import func
    resource_types = db.query(Resource.resource_type, func.count(Resource.id)).filter(Resource.is_active == True).group_by(Resource.resource_type).all()
    avail_by_type = db.query(Resource.resource_type, func.count(Resource.id)).filter(Resource.is_active == True, Resource.availability_status == "available").group_by(Resource.resource_type).all()
    avail_map = {rt: cnt for rt, cnt in avail_by_type}

    utilisation = [
        {"type": rt, "total": cnt, "available": avail_map.get(rt, 0), "utilised": cnt - avail_map.get(rt, 0)}
        for rt, cnt in resource_types
    ]

    # Task distribution
    task_dist = db.query(Task.category, func.count(Task.id)).filter(Task.is_active == True).group_by(Task.category).all()

    # Schedule conflicts (unscheduled tasks in latest schedule)
    conflicts = 0
    if latest_schedule:
        from app.models.schedule import Assignment
        conflicts = db.query(Assignment).filter(
            Assignment.schedule_run_id == latest_schedule.id,
            Assignment.is_scheduled == False
        ).count()

    return {
        "resources": {
            "total": total_resources,
            "available": available_resources,
            "under_maintenance": maintenance_resources,
        },
        "staff": {
            "total": total_staff,
            "available": available_staff,
        },
        "tasks": {
            "total": total_tasks,
            "scheduled": scheduled_tasks,
            "unscheduled": unscheduled_tasks,
        },
        "conflicts": conflicts,
        "latest_schedule": {
            "schedule_id": latest_schedule.schedule_id if latest_schedule else None,
            "status": latest_schedule.status if latest_schedule else None,
            "solver_status": latest_schedule.solver_status if latest_schedule else None,
            "scheduled_tasks": latest_schedule.scheduled_tasks if latest_schedule else 0,
            "total_tasks": latest_schedule.total_tasks if latest_schedule else 0,
            "created_at": latest_schedule.created_at.isoformat() if latest_schedule else None,
        },
        "resource_utilisation": utilisation,
        "task_distribution": [{"category": cat, "count": cnt} for cat, cnt in task_dist],
        "recent_events": [
            {
                "id": e.id,
                "event_type": e.event_type,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "description": e.description,
                "created_at": e.created_at.isoformat(),
            }
            for e in recent_events
        ],
    }
