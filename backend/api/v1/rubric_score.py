from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

import models
from api.deps import db_dependency
from services.rubric_snapshot import (
    close_active_histories_for_rubric,
    snapshot_live_rubric_to_history,
)
from schemas import (
    CriteriaBase,
    CriteriaHistoryCreate,
    CriteriaHistoryModel,
    CriteriaModel,
    LevelBase,
    LevelHistoryCreate,
    LevelHistoryModel,
    LevelModel,
    RubricScoreBase,
    RubricScoreHistoryCreate,
    RubricScoreHistoryModel,
    RubricScoreModel,
    RubricSkillBase,
    RubricSkillHistoryCreate,
    RubricSkillHistoryModel,
    RubricSkillModel,
)

router = APIRouter(tags=["RubricScore"])


@router.post("/rubric/", response_model=RubricScoreModel)
async def create_rubric(rubric: RubricScoreBase, db: db_dependency):
    db_rubric = models.RubricScore(**rubric.model_dump())
    db.add(db_rubric)
    db.flush()
    db.commit()
    db.refresh(db_rubric)
    return db_rubric


@router.get("/rubric/", response_model=List[RubricScoreModel])
async def read_rubrics(db: db_dependency, skip: int = 0, limit: int = 100):
    rubrics = db.query(models.RubricScore).offset(skip).limit(limit).all()
    return rubrics


@router.get("/rubric/{rubric_id}", response_model=RubricScoreModel)
async def read_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    return rubric


@router.get("/rubric/{rubric_id}/rubric_skills", response_model=List[RubricSkillModel])
async def read_rubric_skills(rubric_id: int, db: db_dependency):
    rubric_skills = db.query(models.RubricSkill).filter(models.RubricSkill.rubric_id == rubric_id).all()
    return rubric_skills


@router.delete("/rubric/{rubric_id}")
async def delete_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")

    # Delete rubric itself; related rows are removed by cascading rules.
    db.delete(rubric)
    db.commit()

    return JSONResponse(
        status_code=200,
        content={
            "detail": f"rubric_id {rubric_id} and associated rubric_skills and levels deleted successfully"
        },
    )


@router.put("/rubric/{rubric_id}", response_model=RubricScoreModel)
async def update_rubric(rubric_id: int, rubric: RubricScoreBase, db: db_dependency):
    db_rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not db_rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")

    for key, value in rubric.model_dump().items():
        setattr(db_rubric, key, value)

    db.flush()
    close_active_histories_for_rubric(db, rubric_id)
    snapshot_live_rubric_to_history(db, rubric_id)
    db.commit()
    db.refresh(db_rubric)
    return db_rubric


@router.post("/rubric_skill/", response_model=RubricSkillModel)
async def create_rubric_skill(rubric_skill: RubricSkillBase, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_skill.rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=400, detail=f"rubric_id {rubric_skill.rubric_id} does not exist")

    db_rubric_skill = models.RubricSkill(**rubric_skill.model_dump())
    db.add(db_rubric_skill)
    db.commit()
    db.refresh(db_rubric_skill)
    return db_rubric_skill


@router.get("/rubric_skill/{rubric_skill_id}", response_model=RubricSkillModel)
async def read_rubric_skill(rubric_skill_id: int, db: db_dependency):
    rubric_skill = db.query(models.RubricSkill).filter(models.RubricSkill.id == rubric_skill_id).first()
    if not rubric_skill:
        raise HTTPException(status_code=404, detail=f"rubric_skill_id {rubric_skill_id} not found")
    return rubric_skill


@router.delete("/rubric_skill/{rubric_skill_id}")
async def delete_rubric_skill(rubric_skill_id: int, db: db_dependency):
    rubric_skill = db.query(models.RubricSkill).filter(models.RubricSkill.id == rubric_skill_id).first()
    if not rubric_skill:
        raise HTTPException(status_code=404, detail=f"rubric_skill_id {rubric_skill_id} not found")

    db.delete(rubric_skill)
    db.commit()

    return JSONResponse(
        status_code=200,
        content={"detail": f"rubric_skill_id {rubric_skill_id} and associated criteria deleted successfully"},
    )


@router.put("/rubric_skill/{rubric_skill_id}", response_model=RubricSkillModel)
async def update_rubric_skill(rubric_skill_id: int, rubric_skill: RubricSkillBase, db: db_dependency):
    db_rubric_skill = db.query(models.RubricSkill).filter(models.RubricSkill.id == rubric_skill_id).first()
    if not db_rubric_skill:
        raise HTTPException(status_code=404, detail=f"rubric_skill_id {rubric_skill_id} not found")

    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_skill.rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=400, detail=f"rubric_id {rubric_skill.rubric_id} does not exist")

    for key, value in rubric_skill.model_dump().items():
        setattr(db_rubric_skill, key, value)

    db.commit()
    db.refresh(db_rubric_skill)
    return db_rubric_skill


@router.post("/level/", response_model=LevelModel)
async def create_level(level: LevelBase, db: db_dependency):
    db_level = models.Level(**level.model_dump())
    db.add(db_level)
    db.commit()
    db.refresh(db_level)
    return db_level


@router.get("/rubric/{rubric_id}/levels", response_model=List[LevelModel])
async def read_levels_for_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    level = db.query(models.Level).filter(models.Level.rubric_id == rubric_id).all()
    return level


@router.get("/level/{level_id}", response_model=LevelModel)
async def read_level(level_id: int, db: db_dependency):
    level = db.query(models.Level).filter(models.Level.id == level_id).first()
    if not level:
        raise HTTPException(status_code=404, detail=f"level_id {level_id} not found")
    return level


@router.delete("/level/{level_id}")
async def delete_level(level_id: int, db: db_dependency):
    level = db.query(models.Level).filter(models.Level.id == level_id).first()
    if not level:
        raise HTTPException(status_code=404, detail=f"level_id {level_id} not found")

    db.delete(level)
    db.commit()

    return JSONResponse(
        status_code=200,
        content={"detail": f"level_id {level_id} and associated criteria deleted successfully"},
    )


@router.put("/level/{level_id}", response_model=LevelModel)
async def update_level(level_id: int, level: LevelBase, db: db_dependency):
    db_level = db.query(models.Level).filter(models.Level.id == level_id).first()
    if not db_level:
        raise HTTPException(status_code=404, detail=f"level_id {level_id} not found")

    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == level.rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=400, detail=f"rubric_id {level.rubric_id} does not exist")

    for key, value in level.model_dump().items():
        setattr(db_level, key, value)

    db.commit()
    db.refresh(db_level)
    return db_level


@router.post("/criteria/", response_model=CriteriaModel)
async def create_criteria(criteria: CriteriaBase, db: db_dependency):
    db_criteria = models.Criteria(**criteria.model_dump())
    db.add(db_criteria)
    db.commit()
    db.refresh(db_criteria)
    return db_criteria


@router.get("/rubric/{rubric_id}/criteria", response_model=List[CriteriaModel])
async def read_criteria_for_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    criteria = (
        db.query(models.Criteria)
        .join(models.RubricSkill, models.Criteria.rubric_skill_id == models.RubricSkill.id)
        .filter(models.RubricSkill.rubric_id == rubric_id)
        .all()
    )
    return criteria


@router.get("/criteria/{criteria_id}", response_model=CriteriaModel)
async def read_criteria(criteria_id: int, db: db_dependency):
    criteria = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not criteria:
        raise HTTPException(status_code=404, detail=f"criteria_id {criteria_id} not found")
    return criteria


@router.delete("/criteria/{criteria_id}")
async def delete_criteria(criteria_id: int, db: db_dependency):
    criteria = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not criteria:
        raise HTTPException(status_code=404, detail=f"criteria_id {criteria_id} not found")

    db.delete(criteria)
    db.commit()

    return JSONResponse(status_code=200, content={"detail": f"criteria_id {criteria_id} deleted successfully"})


@router.put("/criteria/{criteria_id}", response_model=CriteriaModel)
async def update_criteria(criteria_id: int, criteria: CriteriaBase, db: db_dependency):
    db_criteria = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not db_criteria:
        raise HTTPException(status_code=404, detail=f"criteria_id {criteria_id} not found")

    skill = db.query(models.RubricSkill).filter(models.RubricSkill.id == criteria.rubric_skill_id).first()
    if not skill:
        raise HTTPException(status_code=400, detail=f"skill_id {criteria.rubric_skill_id} does not exist")

    level = db.query(models.Level).filter(models.Level.id == criteria.level_id).first()
    if not level:
        raise HTTPException(status_code=400, detail=f"level_id {criteria.level_id} does not exist")

    for key, value in criteria.model_dump().items():
        setattr(db_criteria, key, value)

    db.commit()
    db.refresh(db_criteria)
    return db_criteria


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
