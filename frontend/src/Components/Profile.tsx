import React, { useState, useRef, useMemo } from 'react';
import './Profile.css';
import { AiOutlineArrowRight, AiOutlineClose } from 'react-icons/ai';
import { FaBriefcase } from 'react-icons/fa';

const ArrowIcon = AiOutlineArrowRight as React.ComponentType;
const CloseIcon = AiOutlineClose as React.ComponentType;
const BriefcaseIcon = FaBriefcase as React.ComponentType;

interface Skill {
  id: string;
  name: string;
  level?: number;
}

interface Portfolio {
  id: string;
  name: string;
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

  const [portfolios, setPortfolios] = useState<Portfolio[]>([
    { id: '1', name: 'Portfolio 1' },
    { id: '2', name: 'Portfolio 2' },
    { id: '3', name: 'Portfolio 3' },
    { id: '4', name: 'Portfolio 4' },
    { id: '5', name: 'Portfolio 5' },
    { id: '6', name: 'Portfolio 6' },
  ]);

  const [portfolioFiles, setPortfolioFiles] = useState<{ [key: string]: File[] }>({});

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleClearFiles = (id: string) => {
    const updatedFiles = { ...portfolioFiles };
    delete updatedFiles[id];
    setPortfolioFiles(updatedFiles);
    const fileInput = fileInputRefs.current[id];
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUploadClick = (portfolioId: string) => {
    fileInputRefs.current[portfolioId]?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, portfolioId: string) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setPortfolioFiles({
        ...portfolioFiles,
        [portfolioId]: fileArray
      });
      console.log(`Selected files for ${portfolioId}:`, fileArray);
    }
  };

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

  const activeSelectedSkills = useMemo(() => {
    return activeTab === 'hard' ? hardSkillsSelected : softSkillsSelected;
  }, [activeTab, hardSkillsSelected, softSkillsSelected]);

  const evaluationData = useMemo(() => {
    const generateRandomLevel = () => Math.floor(Math.random() * 5) + 1; 
    
    return [
      { evaluator: 'Teacher', levels: activeSelectedSkills.map(() => generateRandomLevel()) },
      { evaluator: 'AI', levels: activeSelectedSkills.map(() => generateRandomLevel()) },
      { evaluator: 'Student (You)', levels: activeSelectedSkills.map(() => generateRandomLevel()) },
    ];
  }, [activeSelectedSkills]);

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

      <div className="portfolio-container">
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">Portfolios</h2>
          <div className="portfolio-grid">
            {portfolios.map((portfolio) => (
              <div key={portfolio.id} className="portfolio-box">
                <div className="portfolio-box-icon">
                  {React.createElement(BriefcaseIcon)}
                </div>
                <div className="portfolio-box-name">{portfolio.name}</div>
                <input
                  ref={(el) => (fileInputRefs.current[portfolio.id] = el)}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileChange(e, portfolio.id)}
                  accept=".jpg,.jpeg"
                />
                <button
                  className="portfolio-upload-button"
                  onClick={() => handleUploadClick(portfolio.id)}
                >
                  {portfolioFiles[portfolio.id] && portfolioFiles[portfolio.id].length > 0
                    ? portfolioFiles[portfolio.id].length === 1
                      ? portfolioFiles[portfolio.id][0].name
                      : `${portfolioFiles[portfolio.id].length} files selected`
                    : 'Upload Portfolio'}
                </button>
                {portfolioFiles[portfolio.id] && portfolioFiles[portfolio.id].length > 0 && (
                  <button
                    className="portfolio-delete-button"
                    onClick={() => handleClearFiles(portfolio.id)}
                  >
                    {React.createElement(CloseIcon)}
                    <span>Delete</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="evaluation-container">
        <div className="evaluation-section">
          <h2 className="evaluation-section-title">Evaluation Results</h2>
          <div className="evaluation-box">
            {activeSelectedSkills.length > 0 ? (
              <div className="evaluation-table-container">
                <table className="evaluation-table">
                  <thead>
                    <tr>
                      <th className="evaluation-table-header">Evaluator</th>
                      {activeSelectedSkills.map((skill) => (
                        <th key={skill.id} className="evaluation-table-header">
                          {skill.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="evaluation-table-row-header">{row.evaluator}</td>
                        {row.levels.map((level, colIndex) => (
                          <td key={colIndex} className="evaluation-table-cell">
                            {level}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="evaluation-content">
                <p className="evaluation-message">No evaluation results available yet.</p>
                <p className="evaluation-submessage">Select {activeTab === 'hard' ? 'hard' : 'soft'} skills to see evaluation results.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
