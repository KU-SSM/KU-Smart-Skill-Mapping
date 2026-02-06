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