from database import Base
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint, ForeignKey, JSON, Float, Boolean
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    password = Column(String)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    role = Column(String, default="student") # student, teacher
    
    skill_evaluations = relationship("SkillEvaluation", back_populates="user", cascade="all,delete-orphan")

class RubricScore(Base):
    __tablename__ = 'rubricscore'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    
    rubric_skills = relationship("RubricSkill", back_populates="rubric_score", cascade="all, delete-orphan")
    levels = relationship("Level", back_populates="rubric_score", cascade="all, delete-orphan")
    rubric_score_history = relationship("RubricScoreHistory", back_populates="rubric_score", cascade="all, delete-orphan")
    
class RubricScoreHistory(Base):
    # This table is used to track the history of rubric score.
    __tablename__ = 'rubric_score_history'
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime) # only store the created_at time, never update, to keep track of when the rubric score is used for a portfolio.
    expired_at = Column(DateTime, nullable=True, default=None) # when the rubric score is updated, we will set the expired_at time for the old rubric score, to keep track of the validity of the rubric score.
    status = Column(String, default="valid") # valid, outdated, expired
    rubric_score_id = Column(Integer, ForeignKey('rubricscore.id', ondelete='CASCADE'), index=True)
    
    rubric_score = relationship("RubricScore", back_populates="rubric_score_history")
    rubric_skills_history = relationship("RubricSkillHistory", back_populates="rubric_score_history", cascade="all, delete-orphan")
    levels_history = relationship("LevelHistory", back_populates="rubric_score_history", cascade="all, delete-orphan")
    skill_evaluations = relationship("SkillEvaluation", back_populates="rubric_score_history")
    ai_evaluated_skills = relationship("AIEvaluatedSkill", back_populates="rubric_score_history")

class RubricSkill (Base):
    __tablename__ = 'rubric_skill' 
    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer, ForeignKey('rubricscore.id', ondelete='CASCADE'), index=True)
    display_order = Column(Integer)
    name = Column(String, nullable=False)
    
    rubric_score = relationship("RubricScore", back_populates="rubric_skills")
    criteria = relationship("Criteria", back_populates="rubric_skill", cascade="all,delete-orphan")
    
class RubricSkillHistory(Base):
    __tablename__ = 'rubric_skill_history'
    id = Column(Integer, primary_key=True, index=True)
    rubric_history_id = Column(Integer, ForeignKey('rubric_score_history.id', ondelete='CASCADE'), index=True)
    name = Column(String, nullable=False)
    display_order = Column(Integer)
    created_at = Column(DateTime)
    
    rubric_score_history = relationship("RubricScoreHistory", back_populates="rubric_skills_history")
    criteria_history = relationship("CriteriaHistory", back_populates="rubric_skill_history", cascade="all,delete-orphan")

class Level (Base):
    __tablename__ = 'level'
    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer, ForeignKey('rubricscore.id', ondelete='CASCADE'), index=True)
    rank = Column(Integer)
    description = Column(String)
    
    rubric_score = relationship("RubricScore", back_populates="levels")
    criteria = relationship("Criteria", back_populates="level", cascade="all,delete-orphan")
    
class LevelHistory(Base):
    __tablename__ = 'level_history'
    id = Column(Integer, primary_key=True, index=True)
    rubric_history_id = Column(Integer, ForeignKey('rubric_score_history.id', ondelete='CASCADE'), index=True)
    rank = Column(Integer)
    description = Column(String)
    created_at = Column(DateTime)
    
    rubric_score_history = relationship("RubricScoreHistory", back_populates="levels_history")
    criteria_history = relationship("CriteriaHistory", back_populates="level_history", cascade="all,delete-orphan")
       
class Criteria (Base):
    __tablename__ = 'criteria'
    id = Column(Integer, primary_key=True, index=True)
    rubric_skill_id = Column(Integer, ForeignKey('rubric_skill.id', ondelete='CASCADE'), index=True)
    level_id = Column(Integer, ForeignKey('level.id', ondelete='CASCADE'), index=True)
    description = Column(String)
    
    rubric_skill = relationship("RubricSkill", back_populates="criteria")
    level = relationship("Level", back_populates="criteria")
    
    __table_args__ = (UniqueConstraint("rubric_skill_id", "level_id", name="uq_skill_level"),)
    
class CriteriaHistory(Base):
    __tablename__ = 'criteria_history'
    id = Column(Integer, primary_key=True, index=True)
    rubric_skill_history_id = Column(Integer, ForeignKey('rubric_skill_history.id', ondelete='CASCADE'), index=True)
    level_history_id = Column(Integer, ForeignKey('level_history.id', ondelete='CASCADE'), index=True)
    description = Column(String)
    created_at = Column(DateTime)
    
    rubric_skill_history = relationship("RubricSkillHistory", back_populates="criteria_history")
    level_history = relationship("LevelHistory", back_populates="criteria_history")
    
class Portfolio(Base):
    __tablename__ = 'portfolio'
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    classification_json = Column(JSON)  # {"skills": [], "categories": [], "summary": ""}
    created_at = Column(DateTime)
    
    ai_evaluated_skills = relationship("AIEvaluatedSkill", back_populates="portfolio", cascade="all,delete-orphan")
    skill_evaluations = relationship("SkillEvaluation", back_populates="portfolio", cascade="all,delete-orphan")

class SkillEvaluation(Base):
    __tablename__ = 'skill_evaluation'
    
    id = Column(Integer, primary_key=True, index=True)
    rubric_score_history_id = Column(Integer, ForeignKey('rubric_score_history.id', ondelete='CASCADE'), index=True)
    portfolio_id = Column(Integer, ForeignKey('portfolio.id', ondelete='CASCADE'), index=True)
    user_id = Column(Integer, ForeignKey('user.id', ondelete='CASCADE'), index=True) # store owner of the evaluated skill, for future reference and analysis.
    created_at = Column(DateTime)
    status = Column(String, default="draft") # draft, outdated, pending, approved, expired, when the rubric skill or level is updated, we will set the status to outdated, when the portfolio is updated with new rubric skill and level, we will set the status to valid, this is to keep track of the validity of the evaluated skill.

    ai_evaluated_skills = relationship("AIEvaluatedSkill", back_populates="skill_evaluation")
    student_evaluated_skills = relationship("StudentEvaluatedSkill", back_populates="skill_evaluation")
    teacher_evaluated_skills = relationship("TeacherEvaluatedSkill", back_populates="skill_evaluation")
    portfolio = relationship("Portfolio", back_populates="skill_evaluations")
    user = relationship("User", back_populates="skill_evaluations")
    rubric_score_history = relationship("RubricScoreHistory", back_populates="skill_evaluations")

class AIEvaluatedSkill(Base):
    __tablename__ = 'ai_evaluated_skill'
    
    id = Column(Integer, primary_key=True, index=True)
    skill_evaluation_id = Column(Integer, ForeignKey('skill_evaluation.id', ondelete='CASCADE'), index=True)
    rubric_score_history_id = Column(Integer, ForeignKey('rubric_score_history.id', ondelete='CASCADE'), index=True)
    portfolio_id = Column(Integer, ForeignKey('portfolio.id', ondelete='CASCADE'), index=True)
    criteria_passing_description = Column(String)  # store the text which is used to determine the passing of the criteria, for future proof and explanation.
    skill_name = Column(String)
    level_rank = Column(Integer)
    
    rubric_score_history = relationship("RubricScoreHistory", back_populates="ai_evaluated_skills")
    portfolio = relationship("Portfolio", back_populates="ai_evaluated_skills")
    skill_evaluation = relationship("SkillEvaluation", back_populates="ai_evaluated_skills")

class StudentEvaluatedSkill(Base):
    __tablename__ = 'student_evaluated_skill'
    
    id = Column(Integer, primary_key=True, index=True)
    skill_evaluation_id = Column(Integer, ForeignKey('skill_evaluation.id', ondelete='CASCADE'), index=True)
    skill_name = Column(String) # store the skill name which is evaluated by student, since the student may not be able to determine the rubric skill and level, we only store the skill name, and we will use the skill name to match the rubric skill and level for evaluation, this is to keep track of the student's self-evaluation.
    level_rank = Column(Integer)  
    
    skill_evaluation = relationship("SkillEvaluation", back_populates="student_evaluated_skills")
       
class TeacherEvaluatedSkill(Base):
    __tablename__ = 'teacher_evaluated_skill'
    
    id = Column(Integer, primary_key=True, index=True)
    skill_evaluation_id = Column(Integer, ForeignKey('skill_evaluation.id', ondelete='CASCADE'), index=True)
    skill_name = Column(String) # store the skill name which is evaluated by teacher, since the teacher may not be able to determine the rubric skill and level, we only store the skill name, and we will use the skill name to match the rubric skill and level for evaluation, this is to keep track of the teacher's evaluation.
    level_rank = Column(Integer)
    
    skill_evaluation = relationship("SkillEvaluation", back_populates="teacher_evaluated_skills")