import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  const [newSkillName, setNewSkillName] = useState('');
  const [skillIdCounter, setSkillIdCounter] = useState(100);
  
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
  
  const [studentEvaluations, setStudentEvaluations] = useState<{ [tab: string]: { [skillId: string]: string } }>({
    hard: {},
    soft: {}
  });

  const [teacherEvaluations, setTeacherEvaluations] = useState<{ [tab: string]: { [skillId: string]: number } }>({
    hard: {},
    soft: {}
  });

  const [aiEvaluations, setAiEvaluations] = useState<{ [tab: string]: { [skillId: string]: number } }>({
    hard: {},
    soft: {}
  });

  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editingAvailableSkill, setEditingAvailableSkill] = useState<Skill | null>(null);
  const [modalLevel, setModalLevel] = useState<string>('');
  const [modalSkillName, setModalSkillName] = useState<string>('');

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
      
      const tabKey = activeTab;
      const generateRandomLevel = () => Math.floor(Math.random() * 5) + 1;
      setAiEvaluations(prev => {
        const newAiValues: { [skillId: string]: number } = {};
        activeSelectedSkills.forEach(skill => {
          newAiValues[skill.id] = generateRandomLevel();
        });
        return { ...prev, [tabKey]: newAiValues };
      });
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
    
    const levelToUse = skillLevels[skill.id] ? parseInt(skillLevels[skill.id]) || level : level;
    
    const updatedAvailable = available.filter(s => s.id !== skill.id);
    const updatedSelected = [...selected, { ...skill, level: levelToUse }];
    
    setSkillLevels({ ...skillLevels, [skill.id]: levelToUse.toString() });
    
    setAvailableSkills(updatedAvailable);
    setSelectedSkills(updatedSelected);
  };

  const handleRemoveSkill = (skill: Skill) => {
    const available = getAvailableSkills();
    const selected = getSelectedSkills();
    
    const updatedSelected = selected.filter(s => s.id !== skill.id);
    const { level, ...skillWithoutLevel } = skill;
    const updatedAvailable = [...available, skillWithoutLevel];
    
    if (level !== undefined) {
      setSkillLevels({ ...skillLevels, [skill.id]: level.toString() });
    }
    
    setAvailableSkills(updatedAvailable);
    setSelectedSkills(updatedSelected);
  };

  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setEditingAvailableSkill(null);
    setModalLevel(skill.level?.toString() || '1');
    setModalSkillName(skill.name);
  };

  const handleEditAvailableSkill = (skill: Skill) => {
    setEditingAvailableSkill(skill);
    setEditingSkill(null);
    setModalLevel(skillLevels[skill.id] === undefined ? '1' : skillLevels[skill.id]);
    setModalSkillName(skill.name);
  };

  const handleCloseModal = () => {
    setEditingSkill(null);
    setEditingAvailableSkill(null);
    setModalLevel('');
    setModalSkillName('');
  };

  const handleApplyEdit = () => {
    if (editingSkill) {
      const selected = getSelectedSkills();
      const levelValue = parseInt(modalLevel) || 1;
      
      const updatedSelected = selected.map(s => 
        s.id === editingSkill.id 
          ? { ...s, name: modalSkillName.trim(), level: levelValue }
          : s
      );
      
      setSkillLevels({ ...skillLevels, [editingSkill.id]: levelValue.toString() });
      
      setSelectedSkills(updatedSelected);
    } else if (editingAvailableSkill) {
      const available = getAvailableSkills();
      const levelValue = modalLevel === '' ? '1' : modalLevel;
      
      const updatedAvailable = available.map(s => 
        s.id === editingAvailableSkill.id 
          ? { ...s, name: modalSkillName.trim() }
          : s
      );
      
      setAvailableSkills(updatedAvailable);
      setSkillLevels({ ...skillLevels, [editingAvailableSkill.id]: levelValue });
    }
    handleCloseModal();
  };

  const handleDeleteSkill = () => {
    if (editingSkill) {
      handleRemoveSkill(editingSkill);
    } else if (editingAvailableSkill) {
      const available = getAvailableSkills();
      const updatedAvailable = available.filter(s => s.id !== editingAvailableSkill.id);
      setAvailableSkills(updatedAvailable);
      const updatedSkillLevels = { ...skillLevels };
      delete updatedSkillLevels[editingAvailableSkill.id];
      setSkillLevels(updatedSkillLevels);
    }
    handleCloseModal();
  };

  const handleAddNewSkill = () => {
    const trimmedName = newSkillName.trim();
    if (!trimmedName) return;
    
    const available = getAvailableSkills();
    const existingSkill = available.find(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingSkill) {
      alert('This skill already exists in the list.');
      return;
    }
    
    const newSkill: Skill = {
      id: `new-${skillIdCounter}`,
      name: trimmedName
    };
    
    setAvailableSkills([...available, newSkill]);
    setNewSkillName('');
    setSkillIdCounter(prev => prev + 1);
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

  useEffect(() => {
    const tabKey = activeTab;
    const generateRandomLevel = () => Math.floor(Math.random() * 5) + 1;
    
    setTeacherEvaluations(prev => {
      const currentValues = prev[tabKey] || {};
      const newTeacherValues: { [skillId: string]: number } = { ...currentValues };
      let hasChanges = false;
      
      activeSelectedSkills.forEach(skill => {
        if (!newTeacherValues[skill.id]) {
          newTeacherValues[skill.id] = generateRandomLevel();
          hasChanges = true;
        }
      });
      
      return hasChanges ? { ...prev, [tabKey]: newTeacherValues } : prev;
    });
    
    setAiEvaluations(prev => {
      const currentValues = prev[tabKey] || {};
      const newAiValues: { [skillId: string]: number } = { ...currentValues };
      let hasChanges = false;
      
      activeSelectedSkills.forEach(skill => {
        if (!newAiValues[skill.id]) {
          newAiValues[skill.id] = generateRandomLevel();
          hasChanges = true;
        }
      });
      
      return hasChanges ? { ...prev, [tabKey]: newAiValues } : prev;
    });
  }, [activeSelectedSkills, activeTab]);

  const hasPortfolioFiles = useMemo(() => {
    return Object.values(portfolioFiles).some(files => files && files.length > 0);
  }, [portfolioFiles]);

  const evaluationData = useMemo(() => {
    const tabKey = activeTab;
    const generateRandomLevel = () => Math.floor(Math.random() * 5) + 1;
    
    const teacherLevels = activeSelectedSkills.map(skill => {
      return teacherEvaluations[tabKey]?.[skill.id] || generateRandomLevel();
    });
    
    const aiLevels = activeSelectedSkills.map(skill => {
      if (!hasPortfolioFiles) {
        return '-';
      }
      return aiEvaluations[tabKey]?.[skill.id] || generateRandomLevel();
    });
    
    const studentLevels = activeSelectedSkills.map(skill => {
      const storedValue = studentEvaluations[tabKey]?.[skill.id];
      return storedValue !== undefined ? storedValue : '-';
    });
    
    return [
      { evaluator: 'Teacher', levels: teacherLevels },
      { evaluator: 'AI', levels: aiLevels },
      { evaluator: 'Student (You)', levels: studentLevels },
    ];
  }, [activeSelectedSkills, activeTab, studentEvaluations, teacherEvaluations, aiEvaluations, hasPortfolioFiles]);

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
            <div className="add-new-skill-container">
              <input
                type="text"
                className="add-new-skill-input"
                placeholder="Add new skill..."
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddNewSkill();
                  }
                }}
              />
              <button
                className="add-new-skill-button"
                onClick={handleAddNewSkill}
                disabled={!newSkillName.trim()}
              >
                Add Skill
              </button>
            </div>
            <div className="skills-list">
              {filteredAvailable.map((skill) => {
                const levelValue = skillLevels[skill.id] || '1';
                return (
                  <div key={skill.id} className="skill-item">
                    <span className="skill-name">
                      {skill.name} (Lv.{levelValue})
                    </span>
                    <div className="add-skill-controls">
                      <button
                        className="edit-skill-button"
                        onClick={() => handleEditAvailableSkill(skill)}
                      >
                        Edit
                      </button>
                      <button
                        className="add-skill-button"
                        onClick={() => {
                          const level = parseInt(levelValue) || 1;
                          handleAddSkill(skill, level);
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
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
            <div className="add-new-skill-spacer"></div>
            <div className="skills-list">
              {filteredSelected.map((skill) => (
                <div key={skill.id} className="skill-item selected">
                  <span className="skill-name">
                    {skill.name} (Lv.{skill.level})
                  </span>
                  <div className="skill-item-buttons">
                    <button
                      className="edit-skill-button"
                      onClick={() => handleEditSkill(skill)}
                    >
                      Edit
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveSkill(skill)}
                    >
                      {React.createElement(CloseIcon)}
                      <span>Remove</span>
                    </button>
                  </div>
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
                        {row.levels.map((level, colIndex) => {
                          const skill = activeSelectedSkills[colIndex];
                          const isStudentRow = row.evaluator === 'Student (You)';
                          const tabKey = activeTab;
                          const currentValue = isStudentRow 
                            ? (studentEvaluations[tabKey]?.[skill.id] !== undefined ? studentEvaluations[tabKey][skill.id] : level)
                            : level;
                          
                          return (
                            <td key={colIndex} className="evaluation-table-cell">
                              {isStudentRow ? (
                                <input
                                  type="text"
                                  value={currentValue}
                                  onKeyDown={(e) => {
                                    if (currentValue === '-' && /^[1-9]$/.test(e.key)) {
                                      e.preventDefault();
                                      setStudentEvaluations(prev => ({
                                        ...prev,
                                        [activeTab]: {
                                          ...prev[activeTab],
                                          [skill.id]: e.key
                                        }
                                      }));
                                    }
                                  }}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (currentValue === '-' && value.length > 0 && /^[1-9]\d*$/.test(value)) {
                                      setStudentEvaluations(prev => ({
                                        ...prev,
                                        [activeTab]: {
                                          ...prev[activeTab],
                                          [skill.id]: value
                                        }
                                      }));
                                    }
                                    else if (value === '' || value === '-' || /^[1-9]\d*$/.test(value)) {
                                      setStudentEvaluations(prev => ({
                                        ...prev,
                                        [activeTab]: {
                                          ...prev[activeTab],
                                          [skill.id]: value
                                        }
                                      }));
                                    }
                                  }}
                                  onFocus={(e) => {
                                    if (currentValue === '-') {
                                      e.target.select();
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value;
                                    const numValue = parseInt(value, 10);
                                    if (value === '' || isNaN(numValue) || numValue < 1) {
                                      setStudentEvaluations(prev => ({
                                        ...prev,
                                        [activeTab]: {
                                          ...prev[activeTab],
                                          [skill.id]: '-'
                                        }
                                      }));
                                    }
                                  }}
                                  className="evaluation-input"
                                />
                              ) : (
                                level
                              )}
                            </td>
                          );
                        })}
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

      {(editingSkill || editingAvailableSkill) && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Skill</h3>
            <div className="modal-form">
              <div className="modal-field">
                <label className="modal-label">Rename Skill:</label>
                <input
                  type="text"
                  className="modal-input"
                  value={modalSkillName}
                  onChange={(e) => setModalSkillName(e.target.value)}
                  placeholder="Skill name"
                />
              </div>
              <div className="modal-field">
                <label className="modal-label">Level:</label>
                <input
                  type="text"
                  className="modal-input"
                  value={modalLevel}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setModalLevel(value);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value === '' || parseInt(value) < 1 || isNaN(parseInt(value))) {
                      setModalLevel('1');
                    }
                  }}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="modal-buttons">
              <button
                className="modal-button modal-button-cancel"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button
                className="modal-button modal-button-delete"
                onClick={handleDeleteSkill}
              >
                {editingSkill ? 'Remove' : 'Delete'}
              </button>
              <button
                className="modal-button modal-button-apply"
                onClick={handleApplyEdit}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
