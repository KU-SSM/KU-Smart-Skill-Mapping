from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

import models
from api.deps import db_dependency
from schemas import (
    CriteriaHistoryCreate,
    CriteriaHistoryModel,
    LevelHistoryCreate,
    LevelHistoryModel,
    RubricScoreHistoryCreate,
    RubricScoreHistoryModel,
    RubricScoreHistoryUpdate,
    RubricSkillHistoryCreate,
    RubricSkillHistoryModel,
)

router = APIRouter(tags=["History"])


def _get_rubric_score_history_or_404(
    db: Session, rubric_history_id: int
) -> models.RubricScoreHistory:
    rh = (
        db.query(models.RubricScoreHistory)
        .filter(models.RubricScoreHistory.id == rubric_history_id)
        .first()
    )
    if not rh:
        raise HTTPException(
            status_code=404,
            detail=f"rubric_score_history_id {rubric_history_id} not found",
        )
    return rh


@router.get(
    "/rubric_score_history/by_rubric/{rubric_id}",
    response_model=List[RubricScoreHistoryModel],
)
async def list_rubric_score_history_by_rubric(
    rubric_id: int, db: db_dependency, skip: int = 0, limit: int = 100
):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    rows = (
        db.query(models.RubricScoreHistory)
        .filter(models.RubricScoreHistory.rubric_score_id == rubric_id)
        .order_by(models.RubricScoreHistory.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return rows


@router.post("/rubric_score_history/", response_model=RubricScoreHistoryModel)
async def create_rubric_score_history(
    body: RubricScoreHistoryCreate, db: db_dependency
):
    rubric = (
        db.query(models.RubricScore)
        .filter(models.RubricScore.id == body.rubric_score_id)
        .first()
    )
    if not rubric:
        raise HTTPException(
            status_code=400,
            detail=f"rubric_score_id {body.rubric_score_id} does not exist",
        )
    now = datetime.utcnow()
    row = models.RubricScoreHistory(
        rubric_score_id=body.rubric_score_id,
        status=body.status or "valid",
        expired_at=body.expired_at,
        created_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/rubric_score_history/", response_model=List[RubricScoreHistoryModel])
async def list_rubric_score_history(
    db: db_dependency, skip: int = 0, limit: int = 100
):
    return (
        db.query(models.RubricScoreHistory)
        .order_by(models.RubricScoreHistory.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get(
    "/rubric_score_history/{rubric_history_id}/rubric_skills",
    response_model=List[RubricSkillHistoryModel],
)
async def list_rubric_skills_for_history(
    rubric_history_id: int, db: db_dependency
):
    _get_rubric_score_history_or_404(db, rubric_history_id)
    return (
        db.query(models.RubricSkillHistory)
        .filter(
            models.RubricSkillHistory.rubric_history_id == rubric_history_id
        )
        .order_by(
            models.RubricSkillHistory.display_order,
            models.RubricSkillHistory.id,
        )
        .all()
    )


@router.get(
    "/rubric_score_history/{rubric_history_id}/levels",
    response_model=List[LevelHistoryModel],
)
async def list_levels_for_history(rubric_history_id: int, db: db_dependency):
    _get_rubric_score_history_or_404(db, rubric_history_id)
    return (
        db.query(models.LevelHistory)
        .filter(models.LevelHistory.rubric_history_id == rubric_history_id)
        .order_by(models.LevelHistory.rank, models.LevelHistory.id)
        .all()
    )


@router.get(
    "/rubric_score_history/{rubric_history_id}/criteria",
    response_model=List[CriteriaHistoryModel],
)
async def list_criteria_for_history(rubric_history_id: int, db: db_dependency):
    _get_rubric_score_history_or_404(db, rubric_history_id)
    return (
        db.query(models.CriteriaHistory)
        .join(
            models.RubricSkillHistory,
            models.CriteriaHistory.rubric_skill_history_id
            == models.RubricSkillHistory.id,
        )
        .filter(
            models.RubricSkillHistory.rubric_history_id == rubric_history_id
        )
        .all()
    )


@router.post(
    "/rubric_score_history/{rubric_history_id}/rubric_skills",
    response_model=RubricSkillHistoryModel,
)
async def create_rubric_skill_history_nested(
    rubric_history_id: int, body: RubricSkillHistoryCreate, db: db_dependency
):
    _get_rubric_score_history_or_404(db, rubric_history_id)
    now = datetime.utcnow()
    row = models.RubricSkillHistory(
        rubric_history_id=rubric_history_id,
        name=body.name,
        display_order=body.display_order,
        created_at=body.created_at or now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post(
    "/rubric_score_history/{rubric_history_id}/levels",
    response_model=LevelHistoryModel,
)
async def create_level_history_nested(
    rubric_history_id: int, body: LevelHistoryCreate, db: db_dependency
):
    _get_rubric_score_history_or_404(db, rubric_history_id)
    now = datetime.utcnow()
    row = models.LevelHistory(
        rubric_history_id=rubric_history_id,
        rank=body.rank,
        description=body.description,
        created_at=body.created_at or now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post(
    "/rubric_score_history/{rubric_history_id}/criteria",
    response_model=CriteriaHistoryModel,
)
async def create_criteria_history_nested(
    rubric_history_id: int, body: CriteriaHistoryCreate, db: db_dependency
):
    _get_rubric_score_history_or_404(db, rubric_history_id)
    sh = (
        db.query(models.RubricSkillHistory)
        .filter(
            models.RubricSkillHistory.id == body.rubric_skill_history_id,
            models.RubricSkillHistory.rubric_history_id == rubric_history_id,
        )
        .first()
    )
    if not sh:
        raise HTTPException(
            status_code=400,
            detail="rubric_skill_history_id invalid or not under this rubric_score_history",
        )
    lh = (
        db.query(models.LevelHistory)
        .filter(
            models.LevelHistory.id == body.level_history_id,
            models.LevelHistory.rubric_history_id == rubric_history_id,
        )
        .first()
    )
    if not lh:
        raise HTTPException(
            status_code=400,
            detail="level_history_id invalid or not under this rubric_score_history",
        )
    now = datetime.utcnow()
    row = models.CriteriaHistory(
        rubric_skill_history_id=body.rubric_skill_history_id,
        level_history_id=body.level_history_id,
        description=body.description,
        created_at=body.created_at or now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/rubric_score_history/{rubric_history_id}",
    response_model=RubricScoreHistoryModel,
)
async def read_rubric_score_history(rubric_history_id: int, db: db_dependency):
    return _get_rubric_score_history_or_404(db, rubric_history_id)


@router.put(
    "/rubric_score_history/{rubric_history_id}",
    response_model=RubricScoreHistoryModel,
)
async def update_rubric_score_history(
    rubric_history_id: int, body: RubricScoreHistoryUpdate, db: db_dependency
):
    row = _get_rubric_score_history_or_404(db, rubric_history_id)
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/rubric_score_history/{rubric_history_id}")
async def delete_rubric_score_history(rubric_history_id: int, db: db_dependency):
    row = _get_rubric_score_history_or_404(db, rubric_history_id)
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={
            "detail": f"rubric_score_history_id {rubric_history_id} deleted (cascades per DB rules)"
        },
    )


@router.get(
    "/rubric_skill_history/{rubric_skill_history_id}",
    response_model=RubricSkillHistoryModel,
)
async def read_rubric_skill_history(
    rubric_skill_history_id: int, db: db_dependency
):
    row = (
        db.query(models.RubricSkillHistory)
        .filter(models.RubricSkillHistory.id == rubric_skill_history_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"rubric_skill_history_id {rubric_skill_history_id} not found",
        )
    return row


@router.delete("/rubric_skill_history/{rubric_skill_history_id}")
async def delete_rubric_skill_history(
    rubric_skill_history_id: int, db: db_dependency
):
    row = (
        db.query(models.RubricSkillHistory)
        .filter(models.RubricSkillHistory.id == rubric_skill_history_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"rubric_skill_history_id {rubric_skill_history_id} not found",
        )
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"detail": f"rubric_skill_history_id {rubric_skill_history_id} deleted"},
    )


@router.get("/level_history/{level_history_id}", response_model=LevelHistoryModel)
async def read_level_history(level_history_id: int, db: db_dependency):
    row = (
        db.query(models.LevelHistory)
        .filter(models.LevelHistory.id == level_history_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404, detail=f"level_history_id {level_history_id} not found"
        )
    return row


@router.delete("/level_history/{level_history_id}")
async def delete_level_history(level_history_id: int, db: db_dependency):
    row = (
        db.query(models.LevelHistory)
        .filter(models.LevelHistory.id == level_history_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404, detail=f"level_history_id {level_history_id} not found"
        )
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"detail": f"level_history_id {level_history_id} deleted"},
    )


@router.get(
    "/criteria_history/{criteria_history_id}",
    response_model=CriteriaHistoryModel,
)
async def read_criteria_history(criteria_history_id: int, db: db_dependency):
    row = (
        db.query(models.CriteriaHistory)
        .filter(models.CriteriaHistory.id == criteria_history_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"criteria_history_id {criteria_history_id} not found",
        )
    return row


@router.delete("/criteria_history/{criteria_history_id}")
async def delete_criteria_history(criteria_history_id: int, db: db_dependency):
    row = (
        db.query(models.CriteriaHistory)
        .filter(models.CriteriaHistory.id == criteria_history_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"criteria_history_id {criteria_history_id} not found",
        )
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"detail": f"criteria_history_id {criteria_history_id} deleted"},
    )