from database import Base
from sqlalchemy import Column, Integer, String, Boolean, ARRAY, DateTime

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
    
class Skill (Base):
    __tablename__ = 'skill'
    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer)
    display_order = Column(Integer)
    
class Level (Base):
    __tablename__ = 'level'
    id = Column(Integer, primary_key=True, index=True)
    rubric_id = Column(Integer)
    rank = Column(Integer)
    
class Criteria (Base):
    __tablename__ = 'criterion'
    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer)
    level_id = Column(Integer)
    description = Column(String)