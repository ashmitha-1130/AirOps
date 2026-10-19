from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut
from app.models.audit import AuditLog

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("", response_model=List[TaskOut])
def list_tasks(
    search: Optional[str] = None,
    category: Optional[str] = None,
    scheduling_status: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Task).filter(Task.is_active == True)
    if search:
        q = q.filter(Task.title.ilike(f"%{search}%") | Task.task_id.ilike(f"%{search}%"))
    if category:
        q = q.filter(Task.category == category)
    if scheduling_status:
        q = q.filter(Task.scheduling_status == scheduling_status)
    return q.offset(skip).limit(limit).all()

@router.post("", response_model=TaskOut, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    if db.query(Task).filter_by(task_id=data.task_id).first():
        raise HTTPException(400, f"Task ID {data.task_id} already exists")
    t = Task(**data.model_dump())
    db.add(t)
    db.add(AuditLog(event_type="TASK_CREATED", entity_type="task", entity_id=data.task_id, actor="user", description=f"Task {data.title} created"))
    db.commit()
    db.refresh(t)
    return t

@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: str, db: Session = Depends(get_db)):
    t = db.query(Task).filter_by(task_id=task_id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    return t

@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: str, data: TaskUpdate, db: Session = Depends(get_db)):
    t = db.query(Task).filter_by(task_id=task_id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    db.add(AuditLog(event_type="TASK_UPDATED", entity_type="task", entity_id=task_id, actor="user", description=f"Task {task_id} updated"))
    db.commit()
    db.refresh(t)
    return t

@router.delete("/{task_id}", status_code=204)
def deactivate_task(task_id: str, db: Session = Depends(get_db)):
    t = db.query(Task).filter_by(task_id=task_id).first()
    if not t:
        raise HTTPException(404, "Task not found")
    t.is_active = False
    db.add(AuditLog(event_type="TASK_DEACTIVATED", entity_type="task", entity_id=task_id, actor="user", description=f"Task {task_id} deactivated"))
    db.commit()
