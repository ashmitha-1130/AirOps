from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.constraint import Constraint
from app.schemas.constraint import ConstraintCreate, ConstraintOut
from app.models.audit import AuditLog

router = APIRouter(prefix="/constraints", tags=["constraints"])

@router.get("", response_model=List[ConstraintOut])
def list_constraints(db: Session = Depends(get_db)):
    return db.query(Constraint).filter(Constraint.is_active == True).all()

@router.post("", response_model=ConstraintOut, status_code=201)
def create_constraint(data: ConstraintCreate, db: Session = Depends(get_db)):
    if db.query(Constraint).filter_by(constraint_id=data.constraint_id).first():
        raise HTTPException(400, f"Constraint ID {data.constraint_id} already exists")
    c = Constraint(**data.model_dump())
    db.add(c)
    db.add(AuditLog(event_type="CONSTRAINT_CREATED", entity_type="constraint", entity_id=data.constraint_id, actor="user", description=f"Constraint {data.constraint_id} created"))
    db.commit()
    db.refresh(c)
    return c

@router.delete("/{constraint_id}", status_code=204)
def deactivate_constraint(constraint_id: str, db: Session = Depends(get_db)):
    c = db.query(Constraint).filter_by(constraint_id=constraint_id).first()
    if not c:
        raise HTTPException(404, "Constraint not found")
    c.is_active = False
    db.commit()
