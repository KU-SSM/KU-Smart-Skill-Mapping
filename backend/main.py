from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Annotated, List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal, engine
import models
from fastapi.middleware.cors import CORSMiddleware
from services.openai_service import get_openai_service
import logging
from datetime import datetime
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
    
# Should be refactored to separate file later on.
class RubricScoreBase(BaseModel):
    name: str
    created_at: datetime # change to set when created later
    updated_at: datetime
    
class RubricScoreModel(RubricScoreBase):
    id: int
    
class RubricSkillBase(BaseModel):
    rubric_id: int
    display_order: int
    name: str

class RubricSkillModel(RubricSkillBase):
    id: int
    
class LevelBase(BaseModel):
    rubric_id: int
    rank: int
    description: str

class LevelModel(LevelBase):
    id: int

class CriteriaBase(BaseModel):
    rubric_skill_id: int
    level_id: int
    description: str

class CriteriaModel(CriteriaBase):
    id: int

class PortfolioBase(BaseModel):
    filename: str
    classification_json: dict

class PortfolioModel(PortfolioBase):
    id: int
    created_at: datetime

class EvaluatedSkillBase(BaseModel):
    rubric_skill_id: int
    level_id: int
    matched_from: str
    criteria_passing_description: str
    criteria_id: int
    confidence: float
    valid_status: bool

class EvaluatedSkillModel(EvaluatedSkillBase):
    id: int
    portfolio_id: int
    created_at: datetime
    
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]

models.Base.metadata.create_all(bind=engine)

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

# PDF Text Extraction Endpoint
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
        
@app.post("/portfolio/evaluate")
async def evaluate_and_save(
    text: str,  # full extracted text from portfolio import
    rubric_id: int,
    db: db_dependency,
    filename: str | None = None,
):
    """
    Classify the provided `text` using OpenAI service, match extracted skills
    to rubric criteria, and persist EvaluatedSkill rows linked to a new
    Portfolio record.
    """
    try:
        if not text:
            raise HTTPException(status_code=400, detail="text is required for evaluation")

        openai_service = get_openai_service()

        # load rubric criteria for matching (must happen before calling match)
        criteria_rows = db.query(models.Criteria).join(
            models.RubricSkill, models.Criteria.rubric_skill_id == models.RubricSkill.id
        ).filter(models.RubricSkill.rubric_id == rubric_id).all()

        # Prepare criteria payload to send to OpenAI matching call
        criteria_payload = [
            {
                "criteria_id": c.id,
                "rubric_skill_id": c.rubric_skill_id,
                "level_id": c.level_id,
                "description": c.description,
            }
            for c in criteria_rows if c.description
        ]

        # Use OpenAI to match text directly to rubric criteria and produce
        # both a classification and structured matches (skill/level/evidence).
        match_result = await openai_service.match_text_to_criteria(text=text, classification={}, criteria=criteria_payload)

        if isinstance(match_result, dict):
            classification = match_result.get("classification") or {"skills": [], "categories": [], "summary": ""}
            matches = match_result.get("matches") or []
        else:
            # backward compatibility: treat as matches list
            classification = {"skills": [], "categories": [], "summary": ""}
            matches = match_result

        # create a Portfolio record to attach evaluated skills
        db_portfolio = models.Portfolio(
            filename=filename or "text_portfolio",
            classification_json=classification,
            created_at=datetime.utcnow()
        )
        db.add(db_portfolio)
        db.commit()
        db.refresh(db_portfolio)

        # matches already obtained from match_result; nothing to do here

        saved_evals = []
        # Persist matches returned by the OpenAI service
        for m in matches:
            crit_id = m.get("criteria_id")
            crit = next((c for c in criteria_rows if c.id == crit_id), None)
            if not crit:
                continue

            eval_row = models.EvaluatedSkill(
                portfolio_id=db_portfolio.id,
                rubric_skill_id=crit.rubric_skill_id,
                level_id=crit.level_id,
                criteria_passing_description=m.get("matched_text") or crit.description,
                criteria_id=crit.id,
                confidence=float(m.get("confidence", 0.0)),
                matched_from=m.get("matched_from") or m.get("matched_from") or "openai",
                created_at=datetime.utcnow()
            )
            db.add(eval_row)
            db.commit()
            db.refresh(eval_row)

            saved_evals.append({
                "id": eval_row.id,
                "rubric_skill_id": eval_row.rubric_skill_id,
                "level_id": eval_row.level_id,
                "confidence": eval_row.confidence,
                "matched_from": eval_row.matched_from,
                "criteria_passing_description": eval_row.criteria_passing_description
            })

        return JSONResponse(status_code=200, content={
            "success": True,
            "portfolio_id": db_portfolio.id,
            "classification": classification,
            "evaluations": saved_evals
        })

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error during evaluation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to evaluate and save: {str(e)}")