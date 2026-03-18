from database import Base
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint, ForeignKey, JSON, Float, Boolean
from sqlalchemy.orm import relationship

class RubricScore(Base):
    __tablename__ = 'rubricscore'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    
    rubric_skills = relationship("RubricSkill", back_populates="rubric_score", cascade="all, delete-orphan")
    levels = relationship("Level", back_populates="rubric_score", cascade="all, delete-orphan")
    
class RubricScoreHistory(Base):
    # This table is used to track which rubric score is used for which portfolio, for future reference and analysis, since the rubric score can be updated in the future, we need to keep track of the used rubric score for each portfolio.
    __tablename__ = 'rubric_score_history'
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime) # only store the created_at time, never update, to keep track of when the rubric score is used for a portfolio.
    expired_at = Column(DateTime, nullable=True) # when the rubric score is updated, we will set the expired_at time for the old rubric score, to keep track of the validity of the rubric score.
    portfolio_id = Column(Integer, ForeignKey('portfolio.id', ondelete='CASCADE'), index=True)
    status = Column(String, default="valid") # valid, outdated, expired
    
    rubric_skills_history = relationship("RubricSkillHistory", back_populates="rubric_score_history", cascade="all, delete-orphan")
    levels_history = relationship("LevelHistory", back_populates="rubric_score_history", cascade="all, delete-orphan")

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
    
    evaluated_skills = relationship("EvaluatedSkill", back_populates="portfolio", cascade="all,delete-orphan")

class AIEvaluatedSkill(Base):
    __tablename__ = 'evaluated_skill'
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey('portfolio.id', ondelete='CASCADE'), index=True)
    rubric_skill_id = Column(Integer, ForeignKey('rubric_skill.id'), index=True)
    level_id = Column(Integer, ForeignKey('level.id'), index=True)
    criteria_passing_description = Column(String)  # store the text which is used to determine the passing of the criteria, for future proof and explanation.
    criteria_id = Column(Integer, ForeignKey('criteria.id'), index=True) # store the criteria id for future reference, not used for evaluation, since the criteria can be updated in the future, we only store the description which is used for evaluation.
    confidence = Column(Float)  # 0-1
    matched_from = Column(String)  # original extracted skill name
    created_at = Column(DateTime)
    valid_status = Column(Boolean, default=True) # valid, outdated, expired, when the rubric skill or level is updated, we will set the validStatus to outdated, when the portfolio is updated with new rubric skill and level, we will set the validStatus to valid, this is to keep track of the validity of the evaluated skill.
    portfolio = relationship("Portfolio", back_populates="evaluated_skills")
    rubric_skill = relationship("RubricSkill")
    level = relationship("Level")

class StudentEvaluatedSkill(Base):
    __tablename__ = 'student_evaluated_skill'
    
    id = Column(Integer, primary_key=True, index=True)
    skill = Column(String) # store the skill name which is evaluated by student, since the student may not be able to determine the rubric skill and level, we only store the skill name, and we will use the skill name to match the rubric skill and level for evaluation, this is to keep track of the student's self-evaluation.
    Level = Column(Integer) 
    user_id = Column(Integer) # store the user id of the student, for future reference and analysis, since the student may update their self-evaluation in the future, we need to keep track of the user's self-evaluation for each skill.

class TeacherEvaluatedSkill(Base):
    __tablename__ = 'teacher_evaluated_skill'
    
    id = Column(Integer, primary_key=True, index=True)
    skill = Column(String) # store the skill name which is evaluated by teacher, since the teacher may not be able to determine the rubric skill and level, we only store the skill name, and we will use the skill name to match the rubric skill and level for evaluation, this is to keep track of the teacher's evaluation.
    Level = Column(Integer)
    user_id = Column(Integer) # store the user id of the teacher, for future reference and analysis, since the teacher may update their evaluation in the future, we need to keep track of the teacher's evaluation for each skill.