from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

import models
from api.deps import db_dependency
from schemas import (
    CriteriaHistoryCreate,
    CriteriaHistoryModel,
    LevelHistoryCreate,
    LevelHistoryModel,
    RubricScoreHistoryCreate,
    RubricScoreHistoryModel,
    RubricSkillHistoryCreate,
    RubricSkillHistoryModel,
)

router = APIRouter(tags=["History"])