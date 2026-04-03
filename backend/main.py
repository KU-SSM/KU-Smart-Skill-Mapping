from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, Response
from typing import List, Optional

from sqlalchemy.orm import joinedload
from database import engine
import models
from fastapi.middleware.cors import CORSMiddleware
from api.router import api_router
from api.deps import db_dependency
import logging

from schemas import *
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Browsers request this on the API origin; avoid noisy 404s in logs."""
    return Response(status_code=204)

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
models.Base.metadata.create_all(bind=engine)
app.include_router(api_router)

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

"""Evaluation-related endpoints moved to api.v1.evaluation"""