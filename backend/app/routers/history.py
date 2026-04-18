import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Prediction, User
from app.redis_client import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/history", tags=["History"])

XRAY_REDIS_TTL = 7 * 24 * 3600  # 7 days


@router.get("")
def list_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Prediction)
        .filter(Prediction.user_id == current_user.id)
        .order_by(Prediction.created_at.desc())
        .limit(50)
        .all()
    )
    return [json.loads(row.entry_json) for row in rows]


@router.get("/{prediction_id}")
def get_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Prediction)
        .filter(Prediction.id == prediction_id, Prediction.user_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Prediction not found.")

    if row.feature == "xray":
        r = get_redis()
        if r:
            try:
                cached = r.get(f"xray:{prediction_id}")
                if cached:
                    return json.loads(cached)
            except Exception as exc:
                logger.warning("Redis read failed for %s: %s", prediction_id, exc)

    return json.loads(row.entry_json)
