import React, { useState } from 'react';
import './Profile.css';
import { AiOutlineArrowRight, AiOutlineClose } from 'react-icons/ai';

const ArrowIcon = AiOutlineArrowRight as React.ComponentType;
const CloseIcon = AiOutlineClose as React.ComponentType;

interface Skill {
  id: string;
  name: string;
  level?: number;
}

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hard' | 'soft'>('hard');
  const [searchLeft, setSearchLeft] = useState('');
  const [searchRight, setSearchRight] = useState('');
  const [skillLevels, setSkillLevels] = useState<{ [key: string]: string }>({});
  
  const [hardSkillsAvailable, setHardSkillsAvailable] = useState<Skill[]>([
    { id: '1', name: 'JavaScript' },
    { id: '2', name: 'Python' },
    { id: '3', name: 'React' },
    { id: '4', name: 'Node.js' },
    { id: '5', name: 'TypeScript' },
    { id: '6', name: 'SQL' },
    { id: '7', name: 'MongoDB' },
    { id: '8', name: 'Git' },
  ]);
  
  const [hardSkillsSelected, setHardSkillsSelected] = useState<Skill[]>([]);
  
  const [softSkillsAvailable, setSoftSkillsAvailable] = useState<Skill[]>([
    { id: '1', name: 'Communication' },
    { id: '2', name: 'Teamwork' },
    { id: '3', name: 'Problem Solving' },
    { id: '4', name: 'Leadership' },
    { id: '5', name: 'Time Management' },
    { id: '6', name: 'Adaptability' },
    { id: '7', name: 'Creativity' },
    { id: '8', name: 'Critical Thinking' },
  ]);
  
  const [softSkillsSelected, setSoftSkillsSelected] = useState<Skill[]>([]);

  const getAvailableSkills = () => {
    return activeTab === 'hard' ? hardSkillsAvailable : softSkillsAvailable;
  };

  const getSelectedSkills = () => {
    return activeTab === 'hard' ? hardSkillsSelected : softSkillsSelected;
  };

  const setAvailableSkills = (skills: Skill[]) => {
    if (activeTab === 'hard') {
      setHardSkillsAvailable(skills);
    } else {
      setSoftSkillsAvailable(skills);
    }
  };

  const setSelectedSkills = (skills: Skill[]) => {
    if (activeTab === 'hard') {
      setHardSkillsSelected(skills);
    } else {
      setSoftSkillsSelected(skills);
    }
  };

  const handleAddSkill = (skill: Skill, level: number = 1) => {
    const available = getAvailableSkills();
    const selected = getSelectedSkills();
    
    const updatedAvailable = available.filter(s => s.id !== skill.id);
    const updatedSelected = [...selected, { ...skill, level }];
    
    setAvailableSkills(updatedAvailable);
    setSelectedSkills(updatedSelected);
  };

  const handleRemoveSkill = (skill: Skill) => {
    const available = getAvailableSkills();
    const selected = getSelectedSkills();
    
    const updatedSelected = selected.filter(s => s.id !== skill.id);
    const { level, ...skillWithoutLevel } = skill;
    const updatedAvailable = [...available, skillWithoutLevel];
    
    setAvailableSkills(updatedAvailable);
    setSelectedSkills(updatedSelected);
  };

  const filteredAvailable = getAvailableSkills().filter(skill =>
    skill.name.toLowerCase().includes(searchLeft.toLowerCase())
  );

  const filteredSelected = getSelectedSkills().filter(skill =>
    skill.name.toLowerCase().includes(searchRight.toLowerCase())
  );

  return (
    <div className="profile-wrapper">
      <div className="profile-container">
        <div className="profile-header">
          <h1 className="profile-title">Your Profile</h1>
        </div>
        
        <div className="skills-tabs-box">
          <button
            className={`skill-tab-button ${activeTab === 'hard' ? 'active' : ''}`}
            onClick={() => setActiveTab('hard')}
          >
            Hard Skills
          </button>
          <button
            className={`skill-tab-button ${activeTab === 'soft' ? 'active' : ''}`}
            onClick={() => setActiveTab('soft')}
          >
            Soft Skills
          </button>
        </div>

        <div className="skills-panels-container">
          <div className="skills-panel left-panel">
            <h2 className="panel-title">
              Skills Not Yet Selected ({getAvailableSkills().length})
            </h2>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search skills"
                value={searchLeft}
                onChange={(e) => setSearchLeft(e.target.value)}
              />
              {searchLeft && (
                <button
                  className="clear-search"
                  onClick={() => setSearchLeft('')}
                >
                  {React.createElement(CloseIcon)}
                </button>
              )}
            </div>
            <div className="skills-list">
              {filteredAvailable.map((skill) => (
                <div key={skill.id} className="skill-item">
                  <span className="skill-name">{skill.name}</span>
                  <div className="add-skill-controls">
                    <label className="level-label">Level:</label>
                    <input
                      type="text"
                      className="level-input"
                      value={skillLevels[skill.id] === undefined ? '1' : skillLevels[skill.id]}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d+$/.test(value)) {
                          setSkillLevels({ ...skillLevels, [skill.id]: value });
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === '' || parseInt(value) < 1 || isNaN(parseInt(value))) {
                          setSkillLevels({ ...skillLevels, [skill.id]: '1' });
                        }
                      }}
                      placeholder="1"
                    />
                    <button
                      className="add-skill-button"
                      onClick={() => {
                        const levelValue = skillLevels[skill.id] || '1';
                        const level = parseInt(levelValue) || 1;
                        handleAddSkill(skill, level);
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="add-skill-section">
            <div className="add-arrow">
              {React.createElement(ArrowIcon)}
            </div>
            <span className="add-text">Add Skill</span>
          </div>

          <div className="skills-panel right-panel">
            <h2 className="panel-title">
              Skills Already Selected ({getSelectedSkills().length})
            </h2>
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search skills"
                value={searchRight}
                onChange={(e) => setSearchRight(e.target.value)}
              />
              {searchRight && (
                <button
                  className="clear-search"
                  onClick={() => setSearchRight('')}
                >
                  {React.createElement(CloseIcon)}
                </button>
              )}
            </div>
            <div className="skills-list">
              {filteredSelected.map((skill) => (
                <div key={skill.id} className="skill-item selected">
                  <span className="skill-name">
                    {skill.name} (Lv.{skill.level})
                  </span>
                  <button
                    className="remove-button"
                    onClick={() => handleRemoveSkill(skill)}
                  >
                    {React.createElement(CloseIcon)}
                    <span>Remove</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
