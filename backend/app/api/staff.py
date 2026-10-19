from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate, StaffOut
from app.models.audit import AuditLog

router = APIRouter(prefix="/staff", tags=["staff"])

@router.get("", response_model=List[StaffOut])
def list_staff(
    search: Optional[str] = None,
    skill_category: Optional[str] = None,
    availability_status: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Staff).filter(Staff.is_active == True)
    if search:
        q = q.filter(Staff.name.ilike(f"%{search}%") | Staff.staff_id.ilike(f"%{search}%"))
    if skill_category:
        q = q.filter(Staff.skill_category == skill_category)
    if availability_status:
        q = q.filter(Staff.availability_status == availability_status)
    return q.offset(skip).limit(limit).all()

@router.post("", response_model=StaffOut, status_code=201)
def create_staff(data: StaffCreate, db: Session = Depends(get_db)):
    if db.query(Staff).filter_by(staff_id=data.staff_id).first():
        raise HTTPException(400, f"Staff ID {data.staff_id} already exists")
    s = Staff(**data.model_dump())
    db.add(s)
    db.add(AuditLog(event_type="STAFF_CREATED", entity_type="staff", entity_id=data.staff_id, actor="user", description=f"Staff {data.name} created"))
    db.commit()
    db.refresh(s)
    return s

@router.get("/{staff_id}", response_model=StaffOut)
def get_staff(staff_id: str, db: Session = Depends(get_db)):
    s = db.query(Staff).filter_by(staff_id=staff_id).first()
    if not s:
        raise HTTPException(404, "Staff not found")
    return s

@router.put("/{staff_id}", response_model=StaffOut)
def update_staff(staff_id: str, data: StaffUpdate, db: Session = Depends(get_db)):
    s = db.query(Staff).filter_by(staff_id=staff_id).first()
    if not s:
        raise HTTPException(404, "Staff not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.add(AuditLog(event_type="STAFF_UPDATED", entity_type="staff", entity_id=staff_id, actor="user", description=f"Staff {staff_id} updated"))
    db.commit()
    db.refresh(s)
    return s

@router.delete("/{staff_id}", status_code=204)
def deactivate_staff(staff_id: str, db: Session = Depends(get_db)):
    s = db.query(Staff).filter_by(staff_id=staff_id).first()
    if not s:
        raise HTTPException(404, "Staff not found")
    s.is_active = False
    db.add(AuditLog(event_type="STAFF_DEACTIVATED", entity_type="staff", entity_id=staff_id, actor="user", description=f"Staff {staff_id} deactivated"))
    db.commit()
