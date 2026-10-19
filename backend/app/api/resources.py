from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.resource import Resource
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceOut
from app.models.audit import AuditLog

router = APIRouter(prefix="/resources", tags=["resources"])

@router.get("", response_model=List[ResourceOut])
def list_resources(
    search: Optional[str] = None,
    resource_type: Optional[str] = None,
    availability_status: Optional[str] = None,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Resource).filter(Resource.is_active == True)
    if search:
        q = q.filter(Resource.name.ilike(f"%{search}%") | Resource.resource_id.ilike(f"%{search}%"))
    if resource_type:
        q = q.filter(Resource.resource_type == resource_type)
    if availability_status:
        q = q.filter(Resource.availability_status == availability_status)
    return q.offset(skip).limit(limit).all()

@router.post("", response_model=ResourceOut, status_code=201)
def create_resource(data: ResourceCreate, db: Session = Depends(get_db)):
    if db.query(Resource).filter_by(resource_id=data.resource_id).first():
        raise HTTPException(400, f"Resource ID {data.resource_id} already exists")
    r = Resource(**data.model_dump())
    db.add(r)
    db.add(AuditLog(event_type="RESOURCE_CREATED", entity_type="resource", entity_id=data.resource_id, actor="user", description=f"Resource {data.name} created"))
    db.commit()
    db.refresh(r)
    return r

@router.get("/{resource_id}", response_model=ResourceOut)
def get_resource(resource_id: str, db: Session = Depends(get_db)):
    r = db.query(Resource).filter_by(resource_id=resource_id).first()
    if not r:
        raise HTTPException(404, "Resource not found")
    return r

@router.put("/{resource_id}", response_model=ResourceOut)
def update_resource(resource_id: str, data: ResourceUpdate, db: Session = Depends(get_db)):
    r = db.query(Resource).filter_by(resource_id=resource_id).first()
    if not r:
        raise HTTPException(404, "Resource not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(r, k, v)
    db.add(AuditLog(event_type="RESOURCE_UPDATED", entity_type="resource", entity_id=resource_id, actor="user", description=f"Resource {resource_id} updated"))
    db.commit()
    db.refresh(r)
    return r

@router.delete("/{resource_id}", status_code=204)
def deactivate_resource(resource_id: str, db: Session = Depends(get_db)):
    r = db.query(Resource).filter_by(resource_id=resource_id).first()
    if not r:
        raise HTTPException(404, "Resource not found")
    r.is_active = False
    db.add(AuditLog(event_type="RESOURCE_DEACTIVATED", entity_type="resource", entity_id=resource_id, actor="user", description=f"Resource {resource_id} deactivated"))
    db.commit()
