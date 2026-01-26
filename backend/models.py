from database import Base
from sqlalchemy import Column, Integer, String, Boolean, ARRAY

class SkillMap(Base):
    __tablename__ = 'skillmap'

    id = Column(Integer, primary_key=True, index=True)
    skills = Column(String) #just a placeholder for skill class for now
    category = Column(String)
    description = Column(String)
    date = Column(String)
