from database import Base
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship

class RubricScore(Base):
    __tablename__ = 'rubricscore'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    
    rubric_skills = relationship("RubricSkill", back_populates="rubric_score", cascade="all, delete-orphan")
    levels = relationship("Level", back_populates="rubric_score", cascade="all, delete-orphan")
    
class RubricSkill (Base):
    __tablename__ = 'rubric_skill' 
    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer, ForeignKey('rubricscore.id', ondelete='CASCADE'), index=True)
    display_order = Column(Integer)
    name = Column(String, nullable=False)
    
    rubric_score = relationship("RubricScore", back_populates="rubric_skills")
    criteria = relationship("Criteria", back_populates="rubric_skill", cascade="all,delete-orphan")

class Level (Base):
    __tablename__ = 'level'
    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer, ForeignKey('rubricscore.id', ondelete='CASCADE'), index=True)
    rank = Column(Integer)
    description = Column(String)
    
    rubric_score = relationship("RubricScore", back_populates="levels")
    criteria = relationship("Criteria", back_populates="level", cascade="all,delete-orphan")
       
class Criteria (Base):
    __tablename__ = 'criteria'
    id = Column(Integer, primary_key=True, index=True)
    rubric_skill_id = Column(Integer, ForeignKey('rubric_skill.id', ondelete='CASCADE'), index=True)
    level_id = Column(Integer, ForeignKey('level.id', ondelete='CASCADE'), index=True)
    description = Column(String)
    
    rubric_skill = relationship("RubricSkill", back_populates="criteria")
    level = relationship("Level", back_populates="criteria")
    
    __table_args__ = (UniqueConstraint("rubric_skill_id", "level_id", name="uq_skill_level"),)
    
class Portfolio(Base):
    __tablename__ = 'portfolio'
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    classification_json = Column(JSON)  # {"skills": [], "categories": [], "summary": ""}
    created_at = Column(DateTime)
    
    evaluated_skills = relationship("EvaluatedSkill", back_populates="portfolio", cascade="all,delete-orphan")

class EvaluatedSkill(Base):
    __tablename__ = 'evaluated_skill'
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey('portfolio.id', ondelete='CASCADE'), index=True)
    rubric_skill_id = Column(Integer, ForeignKey('rubric_skill.id'), index=True)
    level_id = Column(Integer, ForeignKey('level.id'), index=True)
    confidence = Column(Float)  # 0-1
    matched_from = Column(String)  # original extracted skill name
    created_at = Column(DateTime)
    
    portfolio = relationship("Portfolio", back_populates="evaluated_skills")
    rubric_skill = relationship("RubricSkill")
    level = relationship("Level")