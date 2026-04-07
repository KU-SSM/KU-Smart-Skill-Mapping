from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field



class UserBase(BaseModel):
    name: str
    email: str
    password: str
    role: str
    created_at: datetime
    updated_at: datetime

class UserModel(UserBase):
    id: int

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
    criteria_passing_description: Optional[str] = None
    skill_name: str
    level_rank: int


class AIEvaluatedSkillModel(AIEvaluatedSkillBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# Teacher-shaped input for AI rows until the AI pipeline owns full AIEvaluatedSkill fields.
class AIEvaluatedSkillPlaceholderCreate(BaseModel):
    skill_evaluation_id: int
    skill_name: str
    level_rank: int


class AIEvaluatedSkillPlaceholderUpdate(BaseModel):
    skill_name: Optional[str] = None
    level_rank: Optional[int] = None


class PortfolioEvaluateRequest(BaseModel):
    """Body for running AI rubric matching against portfolio text."""

    text: str = Field(..., min_length=1, description="Full portfolio text to evaluate")
    rubric_id: int
    user_id: int
    filename: Optional[str] = None
    file_token: Optional[str] = None
    skill_evaluation_id: Optional[int] = Field(
        None,
        description=(
            "If set, refresh AI results for this SkillEvaluation: update portfolio "
            "classification, replace all AIEvaluatedSkill rows (student/teacher unchanged). "
            "If rubric_id differs from the evaluation's snapshot, re-link to the current active "
            "snapshot for that rubric."
        ),
    )


class AIEvaluationItemResponse(BaseModel):
    """One persisted AI match row + optional match metadata from the model."""

    id: int
    skill_evaluation_id: int
    rubric_score_history_id: int
    portfolio_id: int
    skill_name: str
    level_rank: int
    criteria_passing_description: Optional[str] = None
    criteria_history_id: Optional[int] = None
    criteria_id: Optional[int] = Field(
        None,
        description="Deprecated: same as criteria_history_id when using snapshot rubrics.",
    )
    confidence: Optional[float] = None
    matched_from: Optional[str] = None


class PortfolioEvaluateResponse(BaseModel):
    success: bool = True
    portfolio_id: int
    skill_evaluation_id: int
    rubric_score_history_id: int
    classification: dict[str, Any]
    evaluations: list[AIEvaluationItemResponse]


class StudentEvaluatedSkillBase(BaseModel):
    skill_evaluation_id: int
    skill_name: str
    level_rank: int


class StudentEvaluatedSkillModel(StudentEvaluatedSkillBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class TeacherEvaluatedSkillBase(BaseModel):
    skill_evaluation_id: int
    skill_name: str
    level_rank: int


class TeacherEvaluatedSkillModel(TeacherEvaluatedSkillBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class SkillEvaluationBase(BaseModel):
    rubric_score_history_id: int
    portfolio_id: int
    user_id: int
    created_at: Optional[datetime] = None
    status: str


class SkillEvaluationCreate(BaseModel):
    rubric_score_history_id: int
    portfolio_id: int
    user_id: int
    created_at: Optional[datetime] = None
    status: str = "draft"


class SkillEvaluationUpdate(BaseModel):
    rubric_score_history_id: Optional[int] = None
    portfolio_id: Optional[int] = None
    user_id: Optional[int] = None
    status: Optional[str] = None


class SkillEvaluationModel(SkillEvaluationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class SkillEvaluationFullModel(SkillEvaluationModel):
    """Aggregate for the skill evaluation page (container + three evaluated-skill lists)."""

    ai_evaluated_skills: list[AIEvaluatedSkillModel] = []
    student_evaluated_skills: list[StudentEvaluatedSkillModel] = []
    teacher_evaluated_skills: list[TeacherEvaluatedSkillModel] = []


# --- Rubric snapshot history ---


class RubricScoreHistoryCreate(BaseModel):
    rubric_score_id: int
    status: Optional[str] = "valid"
    expired_at: Optional[datetime] = None


class RubricScoreHistoryUpdate(BaseModel): 
    status: Optional[str] = None
    expired_at: Optional[datetime] = None


class RubricScoreHistoryModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None
    status: Optional[str] = None
    rubric_score_id: int


class RubricSkillHistoryCreate(BaseModel):
    name: str
    display_order: int
    created_at: Optional[datetime] = None


class RubricSkillHistoryModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rubric_history_id: int
    name: str
    display_order: Optional[int] = None
    created_at: Optional[datetime] = None


class LevelHistoryCreate(BaseModel):
    rank: int
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class LevelHistoryModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rubric_history_id: int
    rank: Optional[int] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class CriteriaHistoryCreate(BaseModel):
    rubric_skill_history_id: int
    level_history_id: int
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class CriteriaHistoryModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rubric_skill_history_id: int
    level_history_id: int
    description: Optional[str] = None
    created_at: Optional[datetime] = None
