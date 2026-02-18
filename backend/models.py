from database import Base
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint, ForeignKey
from sqlalchemy.orm import relationship

class SkillMap(Base):
    __tablename__ = 'skillmap'

    id = Column(Integer, primary_key=True, index=True)
    skills = Column(String) #just a placeholder for skill class for now
    category = Column(String)
    description = Column(String)
    date = Column(String)

class RubricScore(Base):
    __tablename__ = 'rubricscore'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    
    skills = relationship("Skill", back_populates="rubric_score", cascade="all, delete-orphan")
    levels = relationship("Level", back_populates="rubric_score", cascade="all, delete-orphan")
    
class Skill (Base):
    __tablename__ = 'skill'
    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer, ForeignKey('rubricscore.id', ondelete='CASCADE'), index=True)
    display_order = Column(Integer)
    
    rubric_score = relationship("RubricScore", back_populates="skills")
    criteria = relationship("Criteria", back_populates="skill", cascade="all,delete-orphan")

class Level (Base):
    __tablename__ = 'level'
    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer, ForeignKey('rubricscore.id', ondelete='CASCADE'), index=True)
    rank = Column(Integer)
    
    rubric_score = relationship("RubricScore", back_populates="levels")
    criteria = relationship("Criteria", back_populates="level", cascade="all,delete-orphan")
       
class Criteria (Base):
    __tablename__ = 'criteria'
    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey('skill.id', ondelete='CASCADE'), index=True)
    level_id = Column(Integer, ForeignKey('level.id', ondelete='CASCADE'), index=True)
    description = Column(String)
    
    skill = relationship("Skill", back_populates="criteria")
    level = relationship("Level", back_populates="criteria")
    
    __table_args__ = (UniqueConstraint("skill_id", "level_id", name="uq_skill_level"),)
    