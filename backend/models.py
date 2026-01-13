from database import Base
from sqlalchemy import Column, Integer, String, Boolean, ARRAY
import sqlalchemy


class SkillMap(Base):
    __tablename__ = 'transactions'

    id = Column(Integer, primary_key=True, index=True)
    # skills = Column(ARRAY)
    category = Column(String)
    description = Column(String)
    date = Column(String)
