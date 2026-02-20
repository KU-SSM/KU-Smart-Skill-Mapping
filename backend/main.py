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
    created_at: datetime
    updated_at: datetime
    
class RubricScoreModel(RubricScoreBase):
    id: int
    
class SkillBase(BaseModel):
    rubric_id: int
    display_order: int
    name: str

class SkillModel(SkillBase):
    id: int
    
class LevelBase(BaseModel):
    rubric_id: int
    rank: int

class LevelModel(LevelBase):
    id: int

class CriteriaBase(BaseModel):
    skill_id: int
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
    skill_id: int
    level_id: int
    confidence: float
    matched_from: str

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

@app.get("/rubric/{rubric_id}/skills", response_model=List[SkillModel])
async def read_skills_for_rubric(rubric_id: int, db: db_dependency):
    skills = db.query(models.Skill).filter(models.Skill.rubric_id == rubric_id).all()
    return skills

@app.delete("/rubric/{rubric_id}")
async def delete_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    
    # delete the rubric itself orphased automatically deleted with cascade
    db.delete(rubric)
    db.commit()
    
    return JSONResponse(status_code=200, content={"detail": f"rubric_id {rubric_id} and associated skills and levels deleted successfully"})

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

@app.post("/skill/", response_model=SkillModel)
async def create_skill(skill: SkillBase, db: db_dependency):
    # validate rubric_id exists
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == skill.rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=400, detail=f"rubric_id {skill.rubric_id} does not exist")

    db_skill = models.Skill(**skill.model_dump())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill

@app.get("/skill/{skill_id}", response_model=SkillModel)
async def read_skill(skill_id: int, db: db_dependency):
    skill = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail=f"skill_id {skill_id} not found")
    return skill

@app.delete("/skill/{skill_id}")
async def delete_skill(skill_id: int, db: db_dependency):
    skill = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail=f"skill_id {skill_id} not found")
    
    # delete the skill and it's orphased criteria with cascade
    db.delete(skill)
    db.commit()
    
    return JSONResponse(status_code=200, content={"detail": f"skill_id {skill_id} and associated criteria deleted successfully"})

@app.put("/skill/{skill_id}", response_model=SkillModel)
async def update_skill(skill_id: int, skill: SkillBase, db: db_dependency):
    db_skill = db.query(models.Skill).filter(models.Skill.id == skill_id).first()
    if not db_skill:
        raise HTTPException(status_code=404, detail=f"skill_id {skill_id} not found")
    
    # validate rubric_id exists
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == skill.rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=400, detail=f"rubric_id {skill.rubric_id} does not exist")
    
    for key, value in skill.model_dump().items():
        setattr(db_skill, key, value)
    
    db.commit()
    db.refresh(db_skill)
    return db_skill

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
async def create_criteria(criterion: CriteriaBase, db: db_dependency):
    db_criteria = models.Criteria(**criterion.model_dump())
    db.add(db_criteria)
    db.commit()
    db.refresh(db_criteria)
    return db_criteria

@app.get("/rubric/{rubric_id}/criteria", response_model=List[CriteriaModel])
async def read_criteria_for_rubric(rubric_id: int, db: db_dependency):
    rubric = db.query(models.RubricScore).filter(models.RubricScore.id == rubric_id).first()
    if not rubric:
        raise HTTPException(status_code=404, detail=f"rubric_id {rubric_id} not found")
    criteria = db.query(models.Criteria).join(models.Skill, models.Criteria.skill_id == models.Skill.id).filter(models.Skill.rubric_id == rubric_id).all()
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
async def update_criteria(criteria_id: int, criterion: CriteriaBase, db: db_dependency):
    db_criteria = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not db_criteria:
        raise HTTPException(status_code=404, detail=f"criteria_id {criteria_id} not found")
    
    # validate skill_id exists
    skill = db.query(models.Skill).filter(models.Skill.id == criterion.skill_id).first()
    if not skill:
        raise HTTPException(status_code=400, detail=f"skill_id {criterion.skill_id} does not exist")
    
    # validate level_id exists
    level = db.query(models.Level).filter(models.Level.id == criterion.level_id).first()
    if not level:
        raise HTTPException(status_code=400, detail=f"level_id {criterion.level_id} does not exist")
    
    for key, value in criterion.model_dump().items():
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
        # classify
        response = await openai_service.classify_text(text)
        logger.info(f"Classification response: {response}")
        
        return JSONResponse(status_code=200, content={
                "success": True,
                "metadata": metadata,
                "classification": response
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
    classification: dict,  # {"skills": [...], "categories": [...], "summary": "..."}
    rubric_id: int,
    db: db_dependency
):
    # Match extracted skills to rubric
    # Save evaluated_skills table
    # No need for original text
    pass