from datetime import datetime
from typing import Any

from pydantic import BaseModel


class RubricScoreBase(BaseModel):
    name: str
    created_at: datetime  # change to set when created later
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
    classification_json: dict[str, Any]


class PortfolioModel(PortfolioBase):
    id: int
    created_at: datetime


class AIEvaluatedSkillBase(BaseModel):
    skill_evaluation_id: int
    rubric_score_history_id: int
    portfolio_id: int
    criteria_passing_description: str
    skill_name: str
    level_rank: int


class AIEvaluatedSkillModel(AIEvaluatedSkillBase):
    id: int


class StudentEvaluatedSkillBase(BaseModel):
    skill_evaluation_id: int
    skill_name: str
    level_rank: int


class StudentEvaluatedSkillModel(StudentEvaluatedSkillBase):
    id: int


class TeacherEvaluatedSkillBase(BaseModel):
    skill_evaluation_id: int
    skill_name: str
    level_rank: int


class TeacherEvaluatedSkillModel(TeacherEvaluatedSkillBase):
    id: int


class SkillEvaluationBase(BaseModel):
    rubric_score_history_id: int
    portfolio_id: int
    user_id: int
    created_at: datetime
    status: str


class SkillEvaluationModel(SkillEvaluationBase):
    id: int
