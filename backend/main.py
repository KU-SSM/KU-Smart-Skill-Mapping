from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Annotated, List, Optional

from sqlalchemy.orm import Session, joinedload
from database import SessionLocal, engine
import models
from fastapi.middleware.cors import CORSMiddleware
from services.openai_service import get_openai_service
from services.ai_evaluation import (
    PortfolioAIEvaluationResult,
    run_portfolio_ai_evaluation,
)
import logging
from datetime import datetime

from schemas import *
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Manual CRUD for ai_evaluated_skill uses teacher-shaped bodies until AI owns criteria text.
AI_EVALUATED_SKILL_CRITERIA_PLACEHOLDER = (
    "[placeholder] Row created with teacher_evaluated_skill-shaped input; "
    "replace when AI pipeline supplies criteria_passing_description."
)

app = FastAPI()

origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]

models.Base.metadata.create_all(bind=engine)

"""User API: Create, Read, Update, Delete"""

@app.post("/user/", response_model=UserModel)
async def create_user(user: UserBase, db: db_dependency):
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/user/{user_id}", response_model=UserModel)
async def read_user(user_id: int, db: db_dependency):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"user_id {user_id} not found")
    return user

@app.delete("/user/{user_id}")
async def delete_user(user_id: int, db: db_dependency):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"user_id {user_id} not found")
    db.delete(user)
    db.commit()
    return JSONResponse(status_code=200, content={"detail": f"user_id {user_id} deleted successfully"})

@app.put("/user/{user_id}", response_model=UserModel)
async def update_user(user_id: int, user: UserBase, db: db_dependency):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail=f"user_id {user_id} not found")
    for key, value in user.model_dump().items():
        setattr(db_user, key, value)
    db.commit()
    db.refresh(db_user)
    return db_user

"""Rubric Score Related API: Create, Read, Update, Delete"""

@app.post("/rubric/", response_model=RubricScoreModel)
async def create_rubric(rubric: RubricScoreBase, db: db_dependency):
    db_rubric = models.RubricScore(**rubric.model_dump())
    db.add(db_rubric)
    db.commit()
    db.refresh(db_rubric)
    return db_rubric

@app.get("/rubric/", response_model=List[RubricScoreModel])
async def read_rubrics(db: db_dependency, skip: int=0, limit: int=100):
    rubrics = db.query(models.RubricScore).offset(skip).limit(limit).all()
    return rubrics

@app.get("/rubric/{rubric_id}", response_model=RubricScoreModel)
async def read_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    return rubric

@app.get("/rubric/{rubric_id}/rubric_skills", response_model=List[RubricSkillModel])
async def read_rubric_skills(rubric_id: int, db: db_dependency):
    rubric_skills = db.query(models.RubricSkill).filter(models.RubricSkill.rubric_id == rubric_id).all()
    return rubric_skills

@app.delete("/rubric/{rubric_id}")
async def delete_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    
    # delete the rubric itself orphased automatically deleted with cascade
    db.delete(rubric)
    db.commit()
    
    return JSONResponse(status_code=200, content={"detail": f"rubric_id {rubric_id} and associated rubric_skills and levels deleted successfully"})

@app.put("/rubric/{rubric_id}", response_model=RubricScoreModel)
async def update_rubric(rubric_id: int, rubric: RubricScoreBase, db: db_dependency):
    db_rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not db_rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    
    for key, value in rubric.model_dump().items():
        setattr(db_rubric, key, value)
    
    db.commit()
    db.refresh(db_rubric)
    return db_rubric

@app.post("/rubric_skill/", response_model=RubricSkillModel)
async def create_rubric_skill(rubric_skill: RubricSkillBase, db: db_dependency):
    # validate rubric_id exists
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_skill.rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=400, detail=f"rubric_id {rubric_skill.rubric_id} does not exist")

    db_rubric_skill = models.RubricSkill(**rubric_skill.model_dump())
    db.add(db_rubric_skill)
    db.commit()
    db.refresh(db_rubric_skill)
    return db_rubric_skill

@app.get("/rubric_skill/{rubric_skill_id}", response_model=RubricSkillModel)
async def read_rubric_skill(rubric_skill_id: int, db: db_dependency):
    rubric_skill = db.query(models.RubricSkill).filter(models.RubricSkill.id == rubric_skill_id).first()
    if not rubric_skill:
        raise HTTPException(status_code=404, detail=f"rubric_skill_id {rubric_skill_id} not found")
    return rubric_skill

@app.delete("/rubric_skill/{rubric_skill_id}")
async def delete_rubric_skill(rubric_skill_id: int, db: db_dependency):
    rubric_skill = db.query(models.RubricSkill).filter(models.RubricSkill.id == rubric_skill_id).first()
    if not rubric_skill:
        raise HTTPException(status_code=404, detail=f"rubric_skill_id {rubric_skill_id} not found")
    
    # delete the skill and it's orphased criteria with cascade
    db.delete(rubric_skill)
    db.commit()
    
    return JSONResponse(status_code=200, content={"detail": f"rubric_skill_id {rubric_skill_id} and associated criteria deleted successfully"})

@app.put("/rubric_skill/{rubric_skill_id}", response_model=RubricSkillModel)
async def update_rubric_skill(rubric_skill_id: int, rubric_skill: RubricSkillBase, db: db_dependency):
    db_rubric_skill = db.query(models.RubricSkill).filter(models.RubricSkill.id == rubric_skill_id).first()
    if not db_rubric_skill:
        raise HTTPException(status_code=404, detail=f"rubric_skill_id {rubric_skill_id} not found")
    
    # validate rubric_id exists
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_skill.rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=400, detail=f"rubric_id {rubric_skill.rubric_id} does not exist")
    
    for key, value in rubric_skill.model_dump().items():
        setattr(db_rubric_skill, key, value)
    
    db.commit()
    db.refresh(db_rubric_skill)
    return db_rubric_skill

@app.post("/level/", response_model=LevelModel)
async def create_level(level: LevelBase, db: db_dependency):
    db_level = models.Level(**level.model_dump())
    db.add(db_level)
    db.commit()
    db.refresh(db_level)
    return db_level

@app.get("/rubric/{rubric_id}/levels", response_model=List[LevelModel])
async def read_levels_for_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    level = db.query(models.Level).filter(models.Level.rubric_id == rubric_id).all()
    return level

@app.get("/level/{level_id}", response_model=LevelModel)
async def read_level(level_id: int, db: db_dependency):
    level = db.query(models.Level).filter(models.Level.id == level_id).first()
    if not level:
        raise HTTPException(status_code=404, detail=f"level_id {level_id} not found")
    return level

@app.delete("/level/{level_id}")
async def delete_level(level_id: int, db: db_dependency):
    level = db.query(models.Level).filter(models.Level.id == level_id).first()
    if not level:
        raise HTTPException(status_code=404, detail=f"level_id {level_id} not found")
    
    # delete the level and it's orphased with cascade
    db.delete(level)
    db.commit()
    
    return JSONResponse(status_code=200, content={"detail": f"level_id {level_id} and associated criteria deleted successfully"})

@app.put("/level/{level_id}", response_model=LevelModel)
async def update_level(level_id: int, level: LevelBase, db: db_dependency):
    db_level = db.query(models.Level).filter(models.Level.id == level_id).first()
    if not db_level:
        raise HTTPException(status_code=404, detail=f"level_id {level_id} not found")
    
    # validate rubric_id exists
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == level.rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=400, detail=f"rubric_id {level.rubric_id} does not exist")
    
    for key, value in level.model_dump().items():
        setattr(db_level, key, value)
    
    db.commit()
    db.refresh(db_level)
    return db_level

@app.post("/criteria/", response_model=CriteriaModel)
async def create_criteria(criteria: CriteriaBase, db: db_dependency):
    db_criteria = models.Criteria(**criteria.model_dump())
    db.add(db_criteria)
    db.commit()
    db.refresh(db_criteria)
    return db_criteria

@app.get("/rubric/{rubric_id}/criteria", response_model=List[CriteriaModel])
async def read_criteria_for_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    criteria = db.query(models.Criteria).join(models.RubricSkill, models.Criteria.rubric_skill_id == models.RubricSkill.id).filter(models.RubricSkill.rubric_id == rubric_id).all()
    return criteria

@app.get("/criteria/{criteria_id}", response_model=CriteriaModel)
async def read_criteria(criteria_id: int, db: db_dependency):
    criteria = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not criteria:
        raise HTTPException(status_code=404, detail=f"criteria_id {criteria_id} not found")
    return criteria

@app.delete("/criteria/{criteria_id}")
async def delete_criteria(criteria_id: int, db: db_dependency):
    criteria = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not criteria:
        raise HTTPException(status_code=404, detail=f"criteria_id {criteria_id} not found")
    
    db.delete(criteria)
    db.commit()
    
    return JSONResponse(status_code=200, content={"detail": f"criteria_id {criteria_id} deleted successfully"})

@app.put("/criteria/{criteria_id}", response_model=CriteriaModel)
async def update_criteria(criteria_id: int, criteria: CriteriaBase, db: db_dependency):
    db_criteria = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not db_criteria:
        raise HTTPException(status_code=404, detail=f"criteria_id {criteria_id} not found")
    
    # validate skill_id exists
    skill = db.query(models.RubricSkill).filter(models.RubricSkill.id == criteria.rubric_skill_id).first()
    if not skill:
        raise HTTPException(status_code=400, detail=f"skill_id {criteria.rubric_skill_id} does not exist")
    
    # validate level_id exists
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


"""Rubric history API (snapshots): Create, Read, Delete only — no PUT"""


@app.get(
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


@app.post("/rubric_score_history/", response_model=RubricScoreHistoryModel)
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


@app.get("/rubric_score_history/", response_model=List[RubricScoreHistoryModel])
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


@app.get(
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


@app.get(
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


@app.get(
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


@app.post(
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


@app.post(
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


@app.post(
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


@app.get(
    "/rubric_score_history/{rubric_history_id}",
    response_model=RubricScoreHistoryModel,
)
async def read_rubric_score_history(rubric_history_id: int, db: db_dependency):
    return _get_rubric_score_history_or_404(db, rubric_history_id)


@app.delete("/rubric_score_history/{rubric_history_id}")
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


@app.get(
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


@app.delete("/rubric_skill_history/{rubric_skill_history_id}")
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


@app.get("/level_history/{level_history_id}", response_model=LevelHistoryModel)
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


@app.delete("/level_history/{level_history_id}")
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


@app.get(
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


@app.delete("/criteria_history/{criteria_history_id}")
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


"""PDF Text Extraction Endpoint"""
@app.post("/portfolio/import")
async def extract_document(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload a PDF file (.pdf)"
            )
        
        # Get OpenAI service instance
        openai_service = get_openai_service()
        
        # Extract text from PDF
        extracted = await openai_service.extract_text_from_pdf(file)
        # result = {"text": "test", "metadata": "test data"}
        
        text = extracted["text"]
        logger.info(f"Extracted text: {text[:100]}...")  # Log first 100 characters
        metadata = extracted["metadata"]
        # Return full extracted text; classification will occur in evaluation step
        response = text

        return JSONResponse(status_code=200, content={
                "success": True,
                "metadata": metadata,
                "text": response
            })
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract text from PDF: {str(e)}"
        )
        
def _portfolio_evaluate_response_from_result(
    result: PortfolioAIEvaluationResult,
) -> PortfolioEvaluateResponse:
    return PortfolioEvaluateResponse(
        success=True,
        portfolio_id=result.portfolio_id,
        skill_evaluation_id=result.skill_evaluation_id,
        rubric_score_history_id=result.rubric_score_history_id,
        classification=result.classification,
        evaluations=[
            AIEvaluationItemResponse(
                id=e.id,
                skill_evaluation_id=e.skill_evaluation_id,
                rubric_score_history_id=e.rubric_score_history_id,
                portfolio_id=e.portfolio_id,
                skill_name=e.skill_name,
                level_rank=e.level_rank,
                criteria_passing_description=e.criteria_passing_description,
                criteria_id=e.criteria_id,
                confidence=e.confidence,
                matched_from=e.matched_from,
            )
            for e in result.evaluations
        ],
    )


@app.post("/portfolio/evaluate", response_model=PortfolioEvaluateResponse)
async def evaluate_and_save(
    text: str,
    rubric_id: int,
    user_id: int,
    db: db_dependency,
    filename: str | None = None,
    skill_evaluation_id: int | None = None,
):
    """
    Primary upload-style evaluation: query params match the import → evaluate flow
    (client sends extracted text after /portfolio/import). Creates Portfolio +
    SkillEvaluation + one AIEvaluatedSkill per rubric skill, or refreshes AI rows
    when skill_evaluation_id is provided (re-upload / new text).
    For long text, prefer POST /ai_evaluation/run with a JSON body.
    """
    try:
        openai_service = get_openai_service()
        result = await run_portfolio_ai_evaluation(
            db,
            text=text,
            rubric_id=rubric_id,
            user_id=user_id,
            filename=filename,
            openai_service=openai_service,
            skill_evaluation_id=skill_evaluation_id,
        )
        return _portfolio_evaluate_response_from_result(result)
    except ValueError as e:
        logger.error("Validation error: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error during evaluation: %s", e)
        raise HTTPException(
            status_code=500, detail=f"Failed to evaluate and save: {str(e)}"
        ) from e


@app.post("/ai_evaluation/run", response_model=PortfolioEvaluateResponse)
async def ai_evaluation_run(body: PortfolioEvaluateRequest, db: db_dependency):
    """
    Same logic as POST /portfolio/evaluate with a JSON body (better for long text).
    Optional skill_evaluation_id replaces AI rows only and updates portfolio classification.
    """
    try:
        openai_service = get_openai_service()
        result = await run_portfolio_ai_evaluation(
            db,
            text=body.text,
            rubric_id=body.rubric_id,
            user_id=body.user_id,
            filename=body.filename,
            openai_service=openai_service,
            skill_evaluation_id=body.skill_evaluation_id,
        )
        return _portfolio_evaluate_response_from_result(result)
    except ValueError as e:
        logger.error("Validation error: %s", e)
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Error during AI evaluation: %s", e)
        raise HTTPException(
            status_code=500, detail=f"Failed to evaluate and save: {str(e)}"
        ) from e


def _get_skill_evaluation_or_404(
    db: Session, skill_evaluation_id: int
) -> models.SkillEvaluation:
    se = (
        db.query(models.SkillEvaluation)
        .filter(models.SkillEvaluation.id == skill_evaluation_id)
        .first()
    )
    if not se:
        raise HTTPException(
            status_code=404,
            detail=f"skill_evaluation_id {skill_evaluation_id} not found",
        )
    return se


def _list_ai_evaluated_skills_for_skill_evaluation(
    skill_evaluation_id: int, db: Session
) -> list[models.AIEvaluatedSkill]:
    _get_skill_evaluation_or_404(db, skill_evaluation_id)
    return (
        db.query(models.AIEvaluatedSkill)
        .filter(
            models.AIEvaluatedSkill.skill_evaluation_id == skill_evaluation_id
        )
        .all()
    )


@app.get(
    "/skill_evaluation/{skill_evaluation_id}/ai_evaluations",
    response_model=list[AIEvaluatedSkillModel],
)
async def list_ai_evaluations_for_skill_evaluation(
    skill_evaluation_id: int, db: db_dependency
):
    return _list_ai_evaluated_skills_for_skill_evaluation(skill_evaluation_id, db)


@app.get(
    "/skill_evaluation/{skill_evaluation_id}/ai_evaluated_skills",
    response_model=list[AIEvaluatedSkillModel],
)
async def list_ai_evaluated_skills_for_skill_evaluation(
    skill_evaluation_id: int, db: db_dependency
):
    """Same data as /ai_evaluations; name aligned with student/teacher nested lists."""
    return _list_ai_evaluated_skills_for_skill_evaluation(skill_evaluation_id, db)


@app.get("/ai_evaluation/{ai_evaluated_skill_id}", response_model=AIEvaluatedSkillModel)
async def get_ai_evaluation(ai_evaluated_skill_id: int, db: db_dependency):
    row = (
        db.query(models.AIEvaluatedSkill)
        .filter(models.AIEvaluatedSkill.id == ai_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404, detail=f"ai_evaluated_skill_id {ai_evaluated_skill_id} not found"
        )
    return row


"""Skill evaluation page API: SkillEvaluation + student / teacher / AI evaluated skills (CRUD)"""


@app.post("/skill_evaluation/", response_model=SkillEvaluationModel)
async def create_skill_evaluation(body: SkillEvaluationCreate, db: db_dependency):
    if not (
        db.query(models.RubricScoreHistory)
        .filter(models.RubricScoreHistory.id == body.rubric_score_history_id)
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail=f"rubric_score_history_id {body.rubric_score_history_id} does not exist",
        )
    if not db.query(models.Portfolio).filter(models.Portfolio.id == body.portfolio_id).first():
        raise HTTPException(
            status_code=400, detail=f"portfolio_id {body.portfolio_id} does not exist"
        )
    if not db.query(models.User).filter(models.User.id == body.user_id).first():
        raise HTTPException(status_code=400, detail=f"user_id {body.user_id} does not exist")
    now = datetime.utcnow()
    row = models.SkillEvaluation(
        rubric_score_history_id=body.rubric_score_history_id,
        portfolio_id=body.portfolio_id,
        user_id=body.user_id,
        created_at=body.created_at or now,
        status=body.status,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/skill_evaluation/", response_model=List[SkillEvaluationModel])
async def list_skill_evaluations(
    db: db_dependency,
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    portfolio_id: Optional[int] = None,
):
    q = db.query(models.SkillEvaluation)
    if user_id is not None:
        q = q.filter(models.SkillEvaluation.user_id == user_id)
    if portfolio_id is not None:
        q = q.filter(models.SkillEvaluation.portfolio_id == portfolio_id)
    return q.order_by(models.SkillEvaluation.id.desc()).offset(skip).limit(limit).all()


@app.get(
    "/skill_evaluation/{skill_evaluation_id}/full",
    response_model=SkillEvaluationFullModel,
)
async def read_skill_evaluation_full(
    skill_evaluation_id: int, db: db_dependency
):
    se = (
        db.query(models.SkillEvaluation)
        .options(
            joinedload(models.SkillEvaluation.ai_evaluated_skills),
            joinedload(models.SkillEvaluation.student_evaluated_skills),
            joinedload(models.SkillEvaluation.teacher_evaluated_skills),
        )
        .filter(models.SkillEvaluation.id == skill_evaluation_id)
        .first()
    )
    if not se:
        raise HTTPException(
            status_code=404,
            detail=f"skill_evaluation_id {skill_evaluation_id} not found",
        )
    return SkillEvaluationFullModel(
        id=se.id,
        rubric_score_history_id=se.rubric_score_history_id,
        portfolio_id=se.portfolio_id,
        user_id=se.user_id,
        created_at=se.created_at,
        status=se.status,
        ai_evaluated_skills=[
            AIEvaluatedSkillModel.model_validate(x) for x in se.ai_evaluated_skills
        ],
        student_evaluated_skills=[
            StudentEvaluatedSkillModel.model_validate(x)
            for x in se.student_evaluated_skills
        ],
        teacher_evaluated_skills=[
            TeacherEvaluatedSkillModel.model_validate(x)
            for x in se.teacher_evaluated_skills
        ],
    )


@app.get("/skill_evaluation/{skill_evaluation_id}", response_model=SkillEvaluationModel)
async def read_skill_evaluation(skill_evaluation_id: int, db: db_dependency):
    return _get_skill_evaluation_or_404(db, skill_evaluation_id)


@app.put("/skill_evaluation/{skill_evaluation_id}", response_model=SkillEvaluationModel)
async def update_skill_evaluation(
    skill_evaluation_id: int, body: SkillEvaluationUpdate, db: db_dependency
):
    row = _get_skill_evaluation_or_404(db, skill_evaluation_id)
    data = body.model_dump(exclude_unset=True)
    if "rubric_score_history_id" in data:
        rid = data["rubric_score_history_id"]
        if rid is not None and not (
            db.query(models.RubricScoreHistory)
            .filter(models.RubricScoreHistory.id == rid)
            .first()
        ):
            raise HTTPException(
                status_code=400, detail=f"rubric_score_history_id {rid} does not exist"
            )
    if "portfolio_id" in data:
        pid = data["portfolio_id"]
        if pid is not None and not (
            db.query(models.Portfolio).filter(models.Portfolio.id == pid).first()
        ):
            raise HTTPException(status_code=400, detail=f"portfolio_id {pid} does not exist")
    if "user_id" in data:
        uid = data["user_id"]
        if uid is not None and not (
            db.query(models.User).filter(models.User.id == uid).first()
        ):
            raise HTTPException(status_code=400, detail=f"user_id {uid} does not exist")
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/skill_evaluation/{skill_evaluation_id}")
async def delete_skill_evaluation(skill_evaluation_id: int, db: db_dependency):
    row = _get_skill_evaluation_or_404(db, skill_evaluation_id)
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"detail": f"skill_evaluation_id {skill_evaluation_id} deleted"},
    )


@app.post("/student_evaluated_skill/", response_model=StudentEvaluatedSkillModel)
async def create_student_evaluated_skill(
    body: StudentEvaluatedSkillBase, db: db_dependency
):
    _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    row = models.StudentEvaluatedSkill(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get(
    "/skill_evaluation/{skill_evaluation_id}/student_evaluated_skills",
    response_model=List[StudentEvaluatedSkillModel],
)
async def list_student_evaluated_skills_for_skill_evaluation(
    skill_evaluation_id: int, db: db_dependency
):
    _get_skill_evaluation_or_404(db, skill_evaluation_id)
    return (
        db.query(models.StudentEvaluatedSkill)
        .filter(
            models.StudentEvaluatedSkill.skill_evaluation_id == skill_evaluation_id
        )
        .all()
    )


@app.get(
    "/student_evaluated_skill/{student_evaluated_skill_id}",
    response_model=StudentEvaluatedSkillModel,
)
async def read_student_evaluated_skill(
    student_evaluated_skill_id: int, db: db_dependency
):
    row = (
        db.query(models.StudentEvaluatedSkill)
        .filter(models.StudentEvaluatedSkill.id == student_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"student_evaluated_skill_id {student_evaluated_skill_id} not found",
        )
    return row


@app.put(
    "/student_evaluated_skill/{student_evaluated_skill_id}",
    response_model=StudentEvaluatedSkillModel,
)
async def update_student_evaluated_skill(
    student_evaluated_skill_id: int, body: StudentEvaluatedSkillBase, db: db_dependency
):
    row = (
        db.query(models.StudentEvaluatedSkill)
        .filter(models.StudentEvaluatedSkill.id == student_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"student_evaluated_skill_id {student_evaluated_skill_id} not found",
        )
    _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/student_evaluated_skill/{student_evaluated_skill_id}")
async def delete_student_evaluated_skill(
    student_evaluated_skill_id: int, db: db_dependency
):
    row = (
        db.query(models.StudentEvaluatedSkill)
        .filter(models.StudentEvaluatedSkill.id == student_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"student_evaluated_skill_id {student_evaluated_skill_id} not found",
        )
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={
            "detail": f"student_evaluated_skill_id {student_evaluated_skill_id} deleted"
        },
    )


@app.post("/teacher_evaluated_skill/", response_model=TeacherEvaluatedSkillModel)
async def create_teacher_evaluated_skill(
    body: TeacherEvaluatedSkillBase, db: db_dependency
):
    _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    row = models.TeacherEvaluatedSkill(**body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get(
    "/skill_evaluation/{skill_evaluation_id}/teacher_evaluated_skills",
    response_model=List[TeacherEvaluatedSkillModel],
)
async def list_teacher_evaluated_skills_for_skill_evaluation(
    skill_evaluation_id: int, db: db_dependency
):
    _get_skill_evaluation_or_404(db, skill_evaluation_id)
    return (
        db.query(models.TeacherEvaluatedSkill)
        .filter(
            models.TeacherEvaluatedSkill.skill_evaluation_id == skill_evaluation_id
        )
        .all()
    )


@app.get(
    "/teacher_evaluated_skill/{teacher_evaluated_skill_id}",
    response_model=TeacherEvaluatedSkillModel,
)
async def read_teacher_evaluated_skill(
    teacher_evaluated_skill_id: int, db: db_dependency
):
    row = (
        db.query(models.TeacherEvaluatedSkill)
        .filter(models.TeacherEvaluatedSkill.id == teacher_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"teacher_evaluated_skill_id {teacher_evaluated_skill_id} not found",
        )
    return row


@app.put(
    "/teacher_evaluated_skill/{teacher_evaluated_skill_id}",
    response_model=TeacherEvaluatedSkillModel,
)
async def update_teacher_evaluated_skill(
    teacher_evaluated_skill_id: int, body: TeacherEvaluatedSkillBase, db: db_dependency
):
    row = (
        db.query(models.TeacherEvaluatedSkill)
        .filter(models.TeacherEvaluatedSkill.id == teacher_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"teacher_evaluated_skill_id {teacher_evaluated_skill_id} not found",
        )
    _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/teacher_evaluated_skill/{teacher_evaluated_skill_id}")
async def delete_teacher_evaluated_skill(
    teacher_evaluated_skill_id: int, db: db_dependency
):
    row = (
        db.query(models.TeacherEvaluatedSkill)
        .filter(models.TeacherEvaluatedSkill.id == teacher_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"teacher_evaluated_skill_id {teacher_evaluated_skill_id} not found",
        )
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={
            "detail": f"teacher_evaluated_skill_id {teacher_evaluated_skill_id} deleted"
        },
    )


@app.post("/ai_evaluated_skill/", response_model=AIEvaluatedSkillModel)
async def create_ai_evaluated_skill_placeholder(
    body: AIEvaluatedSkillPlaceholderCreate, db: db_dependency
):
    """
    Placeholder CRUD: same request shape as teacher_evaluated_skill.
    Fills rubric_score_history_id and portfolio_id from SkillEvaluation;
    criteria_passing_description is a fixed placeholder until AI owns it.
    """
    se = _get_skill_evaluation_or_404(db, body.skill_evaluation_id)
    row = models.AIEvaluatedSkill(
        skill_evaluation_id=se.id,
        rubric_score_history_id=se.rubric_score_history_id,
        portfolio_id=se.portfolio_id,
        criteria_passing_description=AI_EVALUATED_SKILL_CRITERIA_PLACEHOLDER,
        skill_name=body.skill_name,
        level_rank=body.level_rank,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get(
    "/ai_evaluated_skill/{ai_evaluated_skill_id}",
    response_model=AIEvaluatedSkillModel,
)
async def read_ai_evaluated_skill(ai_evaluated_skill_id: int, db: db_dependency):
    row = (
        db.query(models.AIEvaluatedSkill)
        .filter(models.AIEvaluatedSkill.id == ai_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"ai_evaluated_skill_id {ai_evaluated_skill_id} not found",
        )
    return row


@app.put(
    "/ai_evaluated_skill/{ai_evaluated_skill_id}",
    response_model=AIEvaluatedSkillModel,
)
async def update_ai_evaluated_skill_placeholder(
    ai_evaluated_skill_id: int, body: AIEvaluatedSkillPlaceholderUpdate, db: db_dependency
):
    """Placeholder: only skill_name / level_rank (teacher-shaped); criteria text unchanged."""
    row = (
        db.query(models.AIEvaluatedSkill)
        .filter(models.AIEvaluatedSkill.id == ai_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"ai_evaluated_skill_id {ai_evaluated_skill_id} not found",
        )
    data = body.model_dump(exclude_unset=True)
    if "skill_name" in data:
        row.skill_name = data["skill_name"]
    if "level_rank" in data:
        row.level_rank = data["level_rank"]
    db.commit()
    db.refresh(row)
    return row


@app.delete("/ai_evaluated_skill/{ai_evaluated_skill_id}")
async def delete_ai_evaluated_skill(ai_evaluated_skill_id: int, db: db_dependency):
    row = (
        db.query(models.AIEvaluatedSkill)
        .filter(models.AIEvaluatedSkill.id == ai_evaluated_skill_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"ai_evaluated_skill_id {ai_evaluated_skill_id} not found",
        )
    db.delete(row)
    db.commit()
    return JSONResponse(
        status_code=200,
        content={"detail": f"ai_evaluated_skill_id {ai_evaluated_skill_id} deleted"},
    )