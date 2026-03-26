from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

import models
from api.deps import db_dependency
from services.rubric_snapshot import (
    close_active_histories_for_rubric,
    snapshot_live_rubric_to_history,
)
from schemas import (
    CriteriaBase,
    CriteriaModel,
    LevelBase,
    LevelModel,
    RubricScoreBase,
    RubricScoreModel,
    RubricSkillBase,
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

    close_active_histories_for_rubric(db, rubric_id)
    db.refresh(db_rubric)
    snapshot_live_rubric_to_history(db, rubric_id)
    db.commit()
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
