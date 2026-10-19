import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.utils.timezone import ist_now, IST
from app.models.resource import Resource
from app.models.staff import Staff
from app.models.task import Task
from app.models.schedule import ScheduleRun, Assignment
from app.models.audit import AuditLog
from app.schemas.schedule import ScheduleRunOut, ScheduleGenerateRequest, ApproveRequest, RejectRequest
from app.scheduling.engine import (
    run_scheduler, ScheduleTask, ScheduleResource, ScheduleStaff
)

router = APIRouter(prefix="/schedules", tags=["schedules"])


def _build_schedule_inputs(db: Session):
    resources = db.query(Resource).filter(Resource.is_active == True).all()
    staff = db.query(Staff).filter(Staff.is_active == True).all()
    tasks = db.query(Task).filter(Task.is_active == True).all()

    sched_resources = [
        ScheduleResource(
            resource_id=r.resource_id,
            resource_type=r.resource_type,
            availability_status=r.availability_status,
            maintenance_status=r.maintenance_status,
        )
        for r in resources
    ]
    sched_staff = [
        ScheduleStaff(
            staff_id=s.staff_id,
            skill_category=s.skill_category,
            availability_status=s.availability_status,
        )
        for s in staff
    ]
    sched_tasks = []
    for t in tasks:
        es = t.earliest_start
        dl = t.deadline
        if es.tzinfo is None:
            es = es.replace(tzinfo=IST)
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=IST)
        sched_tasks.append(ScheduleTask(
            task_id=t.task_id,
            duration_minutes=t.duration_minutes,
            priority=t.priority,
            earliest_start=es,
            deadline=dl,
            required_resource_type=t.required_resource_type,
            required_skill=t.required_skill,
        ))
    return sched_tasks, sched_resources, sched_staff


@router.post("/generate", response_model=ScheduleRunOut, status_code=201)
def generate_schedule(req: ScheduleGenerateRequest, db: Session = Depends(get_db)):
    # Check no approved schedule exists without explicit override
    if req.parent_schedule_id is None:
        approved = db.query(ScheduleRun).filter(ScheduleRun.status == "APPROVED").first()
        # Allow generating new schedules even if approved ones exist (versioning)

    sched_tasks, sched_resources, sched_staff = _build_schedule_inputs(db)

    result = run_scheduler(sched_tasks, sched_resources, sched_staff, req.time_limit_seconds)

    schedule_id = f"SCH-{uuid.uuid4().hex[:8].upper()}"
    version = 1
    if req.parent_schedule_id:
        parent = db.query(ScheduleRun).filter_by(schedule_id=req.parent_schedule_id).first()
        if parent:
            version = parent.version + 1

    run = ScheduleRun(
        schedule_id=schedule_id,
        version=version,
        status="PENDING_REVIEW",
        solver_status=result.status,
        objective_score=result.objective_score,
        runtime_seconds=result.runtime_seconds,
        total_tasks=result.total_tasks,
        scheduled_tasks=result.scheduled_tasks,
        unscheduled_tasks=result.unscheduled_tasks,
        scenario_description=req.scenario_description,
        parent_schedule_id=req.parent_schedule_id,
    )
    db.add(run)
    db.flush()

    for a in result.assignments:
        st = a.start_time
        et = a.end_time
        if st and st.tzinfo is None:
            st = st.replace(tzinfo=IST)
        if et and et.tzinfo is None:
            et = et.replace(tzinfo=IST)
        db.add(Assignment(
            schedule_run_id=run.id,
            task_id=a.task_id,
            resource_id=a.resource_id,
            staff_id=a.staff_id,
            start_time=st,
            end_time=et,
            is_scheduled=a.is_scheduled,
            unscheduled_reason=a.unscheduled_reason,
            explanation=a.explanation,
        ))

    # Sync task scheduling_status based on assignments
    for a in result.assignments:
        task = db.query(Task).filter_by(task_id=a.task_id).first()
        if task:
            task.scheduling_status = "scheduled" if a.is_scheduled else "unscheduled"

    db.add(AuditLog(
        event_type="SCHEDULE_GENERATED",
        entity_type="schedule",
        entity_id=schedule_id,
        actor="system",
        description=f"Schedule {schedule_id} generated. Status: {result.status}. Scheduled: {result.scheduled_tasks}/{result.total_tasks}",
    ))
    db.commit()
    db.refresh(run)
    return run


@router.get("", response_model=List[ScheduleRunOut])
def list_schedules(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return db.query(ScheduleRun).order_by(ScheduleRun.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{schedule_id}", response_model=ScheduleRunOut)
def get_schedule(schedule_id: str, db: Session = Depends(get_db)):
    run = db.query(ScheduleRun).filter_by(schedule_id=schedule_id).first()
    if not run:
        raise HTTPException(404, "Schedule not found")
    return run


@router.post("/{schedule_id}/approve", response_model=ScheduleRunOut)
def approve_schedule(schedule_id: str, req: ApproveRequest, db: Session = Depends(get_db)):
    run = db.query(ScheduleRun).filter_by(schedule_id=schedule_id).first()
    if not run:
        raise HTTPException(404, "Schedule not found")
    if run.status not in ("PENDING_REVIEW",):
        raise HTTPException(400, f"Schedule is already {run.status}")
    run.status = "APPROVED"
    run.reviewer_id = req.reviewer_id
    run.reviewed_at = ist_now()
    db.add(AuditLog(
        event_type="SCHEDULE_APPROVED",
        entity_type="schedule",
        entity_id=schedule_id,
        actor=req.reviewer_id,
        description=f"Schedule {schedule_id} approved by {req.reviewer_id}",
    ))
    db.commit()
    db.refresh(run)
    return run


@router.post("/{schedule_id}/reject", response_model=ScheduleRunOut)
def reject_schedule(schedule_id: str, req: RejectRequest, db: Session = Depends(get_db)):
    run = db.query(ScheduleRun).filter_by(schedule_id=schedule_id).first()
    if not run:
        raise HTTPException(404, "Schedule not found")
    if run.status not in ("PENDING_REVIEW",):
        raise HTTPException(400, f"Schedule is already {run.status}")
    run.status = "REJECTED"
    run.reviewer_id = req.reviewer_id
    run.review_notes = req.reason
    run.reviewed_at = ist_now()
    db.add(AuditLog(
        event_type="SCHEDULE_REJECTED",
        entity_type="schedule",
        entity_id=schedule_id,
        actor=req.reviewer_id,
        description=f"Schedule {schedule_id} rejected by {req.reviewer_id}. Reason: {req.reason}",
    ))
    db.commit()
    db.refresh(run)
    return run
