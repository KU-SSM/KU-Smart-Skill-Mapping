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

@app.get('/')
async def check():
    return 'hello'

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


class SkillMapBase(BaseModel):
    skills: List[str]
    category: str
    description: str
    date: str

class SkillMapModel(SkillMapBase):
    id: int
    
    # class Config:
    #     orm_mode = True
    
class RubricScoreBase(BaseModel):
    name: str
    created_at: datetime
    updated_at: datetime
    
class RubricScoreModel(RubricScoreBase):
    id: int
    
class SkillBase(BaseModel):
    rubric_id: int
    display_order: int

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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]

models.Base.metadata.create_all(bind=engine)


@app.post("/map/", response_model=SkillMapModel)
async def create_map(map: SkillMapBase, db: db_dependency):
    print('he')
    db_map = models.SkillMap(**map.model_dump())
    db.add(db_map)
    db.commit()
    db.refresh(db_map)
    return db_map


@app.get("/map/", response_model=List[SkillMapModel])
async def read_maps(db: db_dependency, skip: int=0, limit: int=100):
    maps = db.query(models.SkillMap).offset(skip).limit(limit).all()
    return maps

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
    
    # delete associated skills, levels, and criteria
    db.query(models.Skill).filter(models.Skill.rubric_id == rubric_id).delete()
    db.query(models.Level).filter(models.Level.rubric_id == rubric_id).delete()
    
    # delete the rubric itself
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
    
    # delete associated criteria
    db.query(models.Criteria).filter(models.Criteria.skill_id == skill_id).delete()
    
    # delete the skill itself
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
    
    # delete associated criteria
    db.query(models.Criteria).filter(models.Criteria.level_id == level_id).delete()
    
    # delete the level itself
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
    db_criterion = models.Criteria(**criterion.model_dump())
    db.add(db_criterion)
    db.commit()
    db.refresh(db_criterion)
    return db_criterion

@app.get("/criteria/{criteria_id}", response_model=CriteriaModel)
async def read_criteria(criteria_id: int, db: db_dependency):
    criterion = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not criterion:
        raise HTTPException(status_code=404, detail=f"criteria_id {criteria_id} not found")
    return criterion

@app.delete("/criteria/{criteria_id}")
async def delete_criteria(criteria_id: int, db: db_dependency):
    criterion = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not criterion:
        raise HTTPException(status_code=404, detail=f"criteria_id {criteria_id} not found")
    
    db.delete(criterion)
    db.commit()
    
    return JSONResponse(status_code=200, content={"detail": f"criteria_id {criteria_id} deleted successfully"})

@app.put("/criteria/{criteria_id}", response_model=CriteriaModel)
async def update_criteria(criteria_id: int, criterion: CriteriaBase, db: db_dependency):
    db_criterion = db.query(models.Criteria).filter(models.Criteria.id == criteria_id).first()
    if not db_criterion:
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
        setattr(db_criterion, key, value)
    
    db.commit()
    db.refresh(db_criterion)
    return db_criterion

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