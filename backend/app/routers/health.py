import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.database import get_db
from backend.app.schemas.schemas import HealthResponse
from backend.app.ml.inference import anomaly_engine
from backend.app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    db_status = "HEALTHY"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"ERROR: {str(e)}"

    dnn_status = "LOADED (LSTM/Neural weights active)" if (anomaly_engine.keras_model or anomaly_engine.neural_weights) else "HEURISTIC_ACTIVE"
    genai_status = "ONLINE (Gemini API Configured)" if settings.GEMINI_API_KEY else "DOMAIN_EXPERT_FALLBACK_ACTIVE"

    return HealthResponse(
        status="UP",
        database=db_status,
        dnn_model=dnn_status,
        genai=genai_status,
        timestamp=datetime.datetime.utcnow()
    )
