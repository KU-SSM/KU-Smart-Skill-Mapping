from fastapi import APIRouter

from api.v1.evaluation import router as evaluation_router
from api.v1.rubric_score import router as rubric_score_router

api_router = APIRouter()
api_router.include_router(evaluation_router)
api_router.include_router(rubric_score_router)
