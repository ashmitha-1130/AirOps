from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.init_db import load_seed_data

router = APIRouter(tags=["demo"])

@router.post("/demo/load")
def load_demo(db: Session = Depends(get_db)):
    counts = load_seed_data(db)
    return {"status": "success", "loaded": counts}
