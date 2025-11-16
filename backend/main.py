from fastapi import FastAPI, HTTPException, Depends
from typing import Annotated, List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal, engine
import models
from fastapi.middleware.cors import CORSMiddleware
from database import engine


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