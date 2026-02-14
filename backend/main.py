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

@app.post("/level/", response_model=LevelModel)
async def create_level(level: LevelBase, db: db_dependency):
    db_level = models.Level(**level.model_dump())
    db.add(db_level)
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
        classified_text = await openai_service.classify_text(text)
        
        return JSONResponse(status_code=200, content={
                "success": True,
                "metadata": metadata,
                "classification": classified_text
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