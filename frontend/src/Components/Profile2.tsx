import React, { useState, useRef, useMemo, useEffect } from 'react';
import './Profile.css';
import './RubricScore.css';
import { AiOutlineClose, AiOutlineInfoCircle, AiOutlinePlus } from 'react-icons/ai';
import { FaBriefcase } from 'react-icons/fa';
import { importPortfolio } from '../services/portfolioApi';
import { getRubricScores, getRubricScore, RubricScoreDetail } from '../services/rubricScoreApi';

const CloseIcon = AiOutlineClose as React.ComponentType;
const BriefcaseIcon = FaBriefcase as React.ComponentType;
const InfoIcon = AiOutlineInfoCircle as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;

interface Skill {
  skillArea: string;
}

const Profile2: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Rubric Score section state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<{ id: string; title: string }[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [confirmedRubricId, setConfirmedRubricId] = useState<string | null>(null);
  const [selectedRubricData, setSelectedRubricData] = useState<RubricScoreDetail | null>(null);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState<boolean>(true);
  const [isLoadingRubricData, setIsLoadingRubricData] = useState<boolean>(false);
  const [isRubricInfoOpen, setIsRubricInfoOpen] = useState<boolean>(false);
  const [rubricInfoData, setRubricInfoData] = useState<RubricScoreDetail | null>(null);
  const [isRubricInfoLoading, setIsRubricInfoLoading] = useState<boolean>(false);
  const [rubricInfoError, setRubricInfoError] = useState<string | null>(null);

  // Skills selection for evaluation results - 3 separate lists
  const [aiSkills, setAiSkills] = useState<Skill[]>([]);
  const [studentSkills, setStudentSkills] = useState<Skill[]>([]);
  const [studentExtraSkills, setStudentExtraSkills] = useState<Skill[]>([]);
  const [teacherSkills, setTeacherSkills] = useState<Skill[]>([]);
  const [searchAi, setSearchAi] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [searchTeacher, setSearchTeacher] = useState<string>('');

  // Evaluation scores state - using skill area names as keys
  const [teacherEvaluations, setTeacherEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [aiEvaluations, setAiEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [studentEvaluations, setStudentEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [isStudentEditMode, setIsStudentEditMode] = useState<boolean>(false);
  const [originalStudentSkills, setOriginalStudentSkills] = useState<Skill[]>([]);
  const [originalStudentEvaluations, setOriginalStudentEvaluations] = useState<{ [skillArea: string]: string }>({});

  // Load rubric scores on mount
  useEffect(() => {
    const loadRubricScores = async () => {
      try {
        setIsLoadingRubrics(true);
        const scores = await getRubricScores();
        setRubricScores(scores);
      } catch (error) {
        console.error('Error loading rubric scores:', error);
        setRubricScores([]);
      } finally {
        setIsLoadingRubrics(false);
      }
    };

    loadRubricScores();
  }, []);

  // Load confirmed rubric data (only after user confirms selection)
  useEffect(() => {
    const loadRubricData = async () => {
      if (!confirmedRubricId) {
        setSelectedRubricData(null);
        return;
      }

      try {
        setIsLoadingRubricData(true);
        const rubricData = await getRubricScore(confirmedRubricId);
        setSelectedRubricData(rubricData);
        
        // Initialize skills from rubric rows - all panels show the same skills
        const skillsFromRubric: Skill[] = rubricData.rows.map(row => ({
          skillArea: row.skillArea
        }));
        // All three panels show the same skill areas
        setAiSkills(skillsFromRubric);
        setStudentSkills(skillsFromRubric);
        setStudentExtraSkills([]);
        setTeacherSkills(skillsFromRubric);
        
        // Initialize evaluations with random values for teacher and AI (as strings for input fields)
        const generateRandomLevel = () => Math.floor(Math.random() * 5) + 1;
        const newTeacherValues: { [skillArea: string]: string } = {};
        const newAiValues: { [skillArea: string]: string } = {};
        const newStudentValues: { [skillArea: string]: string } = {};
        
        // Use skill areas from rows
        rubricData.rows.forEach((row) => {
          const skillArea = row.skillArea;
          newTeacherValues[skillArea] = String(generateRandomLevel());
          newAiValues[skillArea] = String(generateRandomLevel()); // Always generate random AI score
          newStudentValues[skillArea] = '';
        });
        
        setTeacherEvaluations(newTeacherValues);
        setAiEvaluations(newAiValues);
        setStudentEvaluations(newStudentValues);
      } catch (error: any) {
        console.error('Error loading rubric data:', error);
        // Only set to null if it's a critical error (like rubric not found or network failure)
        if (error?.message?.includes('Failed to fetch rubric score') || 
            error?.response?.status === 404 ||
            error?.code === 'ERR_NETWORK') {
          setSelectedRubricData(null);
        } else {
          // For other errors, try to continue with partial data or empty structure
          console.warn('Continuing with partial rubric data due to:', error?.message);
          // Set empty rubric structure so UI can show appropriate message
          setSelectedRubricData({
            id: confirmedRubricId || '',
            title: 'Unknown Rubric',
            headers: [],
            rows: [],
          });
        }
      } finally {
        setIsLoadingRubricData(false);
      }
    };

    loadRubricData();
  }, [confirmedRubricId, uploadedFiles.length]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Accept only PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      console.warn('Please upload PDF files only. The backend only accepts PDF format.');
      event.target.value = '';
      return;
    }

    // Enforce 10MB max (10 * 1024 * 1024 bytes)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      console.warn('File is too large. Maximum size is 10MB.');
      event.target.value = '';
      return;
    }

    // Store only a single selected file
    setUploadedFiles([file]);
    
    try {
      const result = await importPortfolio(
        'portfolio-general',
        'General Portfolio',
        [file]
      );
      console.log('Portfolio import successful:', result);
    } catch (error: any) {
      console.error('Error importing portfolio:', error);
    }
  };

  const filteredRubricScores = useMemo(() => {
    if (!searchQuery.trim()) {
      return rubricScores;
    }
    const query = searchQuery.toLowerCase();
    return rubricScores.filter(rubric =>
      rubric.title.toLowerCase().includes(query)
    );
  }, [rubricScores, searchQuery]);

  const handleRubricSelect = (rubricId: string) => {
    setSelectedRubricId(rubricId);
  };

  const handleConfirmRubric = () => {
    if (!selectedRubricId) {
      return;
    }
    setConfirmedRubricId(selectedRubricId);
    console.log('Confirmed rubric selection:', selectedRubricId);
  };

  const handleOpenRubricInfo = async (e: React.MouseEvent, rubricId: string) => {
    e.stopPropagation();
    setIsRubricInfoOpen(true);
    setIsRubricInfoLoading(true);
    setRubricInfoError(null);
    try {
      const data = await getRubricScore(rubricId);
      setRubricInfoData(data);
    } catch (error: any) {
      console.error('Error loading rubric info:', error);
      setRubricInfoData(null);
      setRubricInfoError(
        error?.message || 'Failed to load rubric details. Please try again.'
      );
    } finally {
      setIsRubricInfoLoading(false);
    }
  };

  const handleCloseRubricInfo = () => {
    setIsRubricInfoOpen(false);
  };

  // Filter skills for each panel
  const filteredAiSkills = useMemo(() => {
    if (!searchAi.trim()) {
      return aiSkills;
    }
    const query = searchAi.toLowerCase();
    return aiSkills.filter(skill =>
      skill.skillArea.toLowerCase().includes(query)
    );
  }, [aiSkills, searchAi]);

  const filteredStudentSkills = useMemo(() => {
    const combined = [...studentSkills, ...studentExtraSkills];
    if (!searchStudent.trim()) {
      return combined;
    }
    const query = searchStudent.toLowerCase();
    return combined.filter(skill =>
      skill.skillArea.toLowerCase().includes(query)
    );
  }, [studentSkills, studentExtraSkills, searchStudent]);

  const filteredTeacherSkills = useMemo(() => {
    if (!searchTeacher.trim()) {
      return teacherSkills;
    }
    const query = searchTeacher.toLowerCase();
    return teacherSkills.filter(skill =>
      skill.skillArea.toLowerCase().includes(query)
    );
  }, [teacherSkills, searchTeacher]);

  const isConfirmDisabled =
    !selectedRubricId || selectedRubricId === confirmedRubricId;

  const handleEnterStudentEditMode = () => {
    setOriginalStudentSkills(studentSkills.map((s) => ({ ...s })));
    setOriginalStudentEvaluations({ ...studentEvaluations });
    setIsStudentEditMode(true);
  };

  const handleSaveStudentEdits = () => {
    // Save current edits as the new baseline, stay in edit mode
    setOriginalStudentSkills(studentSkills.map((s) => ({ ...s })));
    setOriginalStudentEvaluations({ ...studentEvaluations });
  };

  const handleCancelStudentEdits = () => {
    setStudentSkills(originalStudentSkills.map((s) => ({ ...s })));
    setStudentEvaluations({ ...originalStudentEvaluations });
    setIsStudentEditMode(false);
  };

  const handleDoneStudentEditing = () => {
    setIsStudentEditMode(false);
  };

  const handleAddStudentSkill = () => {
    const base = 'New Skill';
    const existing = new Set(
      [...studentSkills, ...studentExtraSkills].map((s) => s.skillArea)
    );
    let nextName = base;
    let i = 2;
    while (existing.has(nextName)) {
      nextName = `${base} ${i}`;
      i += 1;
    }

    setStudentExtraSkills((prev) => [...prev, { skillArea: nextName }]);
    setStudentEvaluations((prev) => ({ ...prev, [nextName]: '' }));
  };

  const handleDeleteStudentCustomSkill = (skillArea: string) => {
    setStudentExtraSkills((prev) => prev.filter((s) => s.skillArea !== skillArea));
    setStudentEvaluations((prev) => {
      const next = { ...prev };
      delete next[skillArea];
      return next;
    });
  };

  const handleRenameStudentCustomSkill = (oldSkillArea: string, nextSkillAreaRaw: string) => {
    const nextSkillArea = nextSkillAreaRaw.trim();
    if (!nextSkillArea || nextSkillArea === oldSkillArea) return;

    const existing = new Set(
      [...studentSkills, ...studentExtraSkills].map((s) => s.skillArea)
    );
    existing.delete(oldSkillArea);

    if (existing.has(nextSkillArea)) {
      alert('That skill name already exists.');
      return;
    }

    setStudentExtraSkills((prev) =>
      prev.map((s) => (s.skillArea === oldSkillArea ? { ...s, skillArea: nextSkillArea } : s))
    );
    setStudentEvaluations((prev) => {
      const next = { ...prev };
      const oldVal = next[oldSkillArea] ?? '';
      delete next[oldSkillArea];
      next[nextSkillArea] = oldVal;
      return next;
    });
  };

  return (
    <div className="profile-wrapper">
      {/* Your Profile Section */}
      <div className="portfolio-container">
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">Your Profile</h2>

          <div className="profile2-upload-row">
            <input
              ref={(el) => (fileInputRef.current = el)}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf"
            />

            <button
              className="profile2-upload-button"
              onClick={handleUploadClick}
              type="button"
            >
              <span className="profile2-upload-icon">
                {React.createElement(BriefcaseIcon)}
              </span>
              <span className="profile2-upload-label">
                {uploadedFiles[0]?.name || 'Upload File'}
              </span>
            </button>

            <span className="profile2-upload-hint">
              Max file size 10MB.
            </span>
          </div>
        </div>
      </div>

      {/* Choose Rubric Score Section */}
      <div className="rubric-score-container">
        <h2 className="portfolio-section-title" style={{ marginBottom: '20px' }}>Choose Rubric Score</h2>
        <div className="rubric-score-search-container">
          <input
            type="text"
            className="rubric-score-search-input"
            placeholder="Search rubric score"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="rubric-score-clear-search"
              onClick={() => setSearchQuery('')}
            >
              {React.createElement(CloseIcon)}
            </button>
          )}
        </div>
        <div className="rubric-score-bars-container">
          {isLoadingRubrics ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading rubrics...</div>
          ) : (
            filteredRubricScores.map((rubric) => (
              <div
                key={rubric.id}
                className={`rubric-score-bar profile2-rubric-bar ${selectedRubricId === rubric.id ? 'selected' : ''}`}
                onClick={() => handleRubricSelect(rubric.id)}
                style={{
                  backgroundColor: selectedRubricId === rubric.id ? 'rgba(178, 187, 30, 0.8)' : '#ffffff',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <span className="rubric-score-bar-title">{rubric.title}</span>
                <button
                  className="profile2-view-details-button"
                  title="View rubric details"
                  type="button"
                  aria-label="More information"
                  onClick={(e) => handleOpenRubricInfo(e, rubric.id)}
                >
                  <span className="profile2-view-details-icon">
                    {React.createElement(InfoIcon)}
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
        <div className="rubric-score-actions">
          <button
            type="button"
            className="profile2-confirm-rubric-button"
            onClick={handleConfirmRubric}
            disabled={isConfirmDisabled}
          >
            Confirm Selection
          </button>
        </div>
      </div>

      {/* Evaluation Results Section */}
      <div className="evaluation-container">
        <div className="evaluation-section">
          <div className="evaluation-header-container">
            <h2 className="evaluation-section-title">
              Evaluation Results
              {selectedRubricData && (
                <span style={{ fontSize: '18px', fontWeight: 'normal', marginLeft: '10px', color: '#666' }}>
                  - {selectedRubricData.title}
                </span>
              )}
            </h2>
            <button
              className="profile2-request-evaluation-button"
              type="button"
              disabled={!confirmedRubricId || !selectedRubricData}
              onClick={() => {
                // Handle request teacher evaluation (placeholder)
                console.log('Request Teacher Evaluation clicked');
              }}
            >
              Request Teacher Evaluation
            </button>
          </div>
          
          {isLoadingRubricData ? (
            <div className="evaluation-content">
              <p className="evaluation-message">Loading rubric data...</p>
            </div>
          ) : selectedRubricData && selectedRubricData.rows.length > 0 ? (
            <>
              {/* Skills Selection Panels - 3 boxes in a row */}
              <div className="skills-panels-container profile2-three-panels">
                <div className="skills-panel profile2-panel">
                  <h2 className="panel-title">
                    AI
                  </h2>
                  <div className="search-container">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search skills"
                      value={searchAi}
                      onChange={(e) => setSearchAi(e.target.value)}
                    />
                    {searchAi && (
                      <button
                        className="clear-search"
                        onClick={() => setSearchAi('')}
                      >
                        {React.createElement(CloseIcon)}
                      </button>
                    )}
                  </div>
                  <div className="skills-list">
                    {filteredAiSkills.map((skill, index) => (
                      <div key={index} className="skill-item profile2-skill-item">
                        <span className="skill-name">
                          {skill.skillArea}
                        </span>
                        <input
                          type="text"
                          className="profile2-score-input ai-score-input"
                          value={aiEvaluations[skill.skillArea] || ''}
                          readOnly
                          placeholder="Auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="skills-panel profile2-panel">
                  <h2 className="panel-title">
                    Student
                  </h2>
                  <div className="search-container">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search skills"
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                    />
                    {searchStudent && (
                      <button
                        className="clear-search"
                        onClick={() => setSearchStudent('')}
                      >
                        {React.createElement(CloseIcon)}
                      </button>
                    )}
                  </div>
                  <div className="skills-list">
                    {filteredStudentSkills.map((skill, index) => (
                      <div key={index} className="skill-item profile2-skill-item profile2-skill-item-deletable">
                        {isStudentEditMode &&
                          studentExtraSkills.some((s) => s.skillArea === skill.skillArea) && (
                            <button
                              type="button"
                              className="profile2-skill-delete-button"
                              title="Remove skill"
                              aria-label="Remove skill"
                              onClick={() => handleDeleteStudentCustomSkill(skill.skillArea)}
                            >
                              {React.createElement(CloseIcon)}
                            </button>
                          )}
                        {isStudentEditMode &&
                        studentExtraSkills.some((s) => s.skillArea === skill.skillArea) ? (
                          <input
                            type="text"
                            className="profile2-custom-skill-name-input"
                            defaultValue={skill.skillArea}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.currentTarget as HTMLInputElement).blur();
                              } else if (e.key === 'Escape') {
                                e.currentTarget.value = skill.skillArea;
                                (e.currentTarget as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={(e) => handleRenameStudentCustomSkill(skill.skillArea, e.target.value)}
                          />
                        ) : (
                          <span className="skill-name">{skill.skillArea}</span>
                        )}
                        <input
                          type="text"
                          className="profile2-score-input student-score-input"
                          value={studentEvaluations[skill.skillArea] || ''}
                          readOnly={!isStudentEditMode}
                          onChange={
                            !isStudentEditMode
                              ? undefined
                              : (e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d+$/.test(value)) {
                                    setStudentEvaluations(prev => ({
                                      ...prev,
                                      [skill.skillArea]: value
                                    }));
                                  }
                                }
                          }
                          onBlur={
                            !isStudentEditMode
                              ? undefined
                              : (e) => {
                                  const value = e.target.value;
                                  if (value && (!/^\d+$/.test(value) || parseInt(value) < 1)) {
                                    setStudentEvaluations(prev => ({
                                      ...prev,
                                      [skill.skillArea]: ''
                                    }));
                                  }
                                }
                          }
                          placeholder="Score"
                        />
                      </div>
                    ))}
                    {isStudentEditMode && (
                      <div
                        className="rubric-score-add-box"
                        onClick={handleAddStudentSkill}
                        title="Add Skill"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAddStudentSkill();
                          }
                        }}
                      >
                        <span className="rubric-score-add-box-spacer"></span>
                        <button
                          className="rubric-score-add-box-button"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddStudentSkill();
                          }}
                          title="Add Skill"
                        >
                          {React.createElement(PlusIcon)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="skills-panel profile2-panel">
                  <h2 className="panel-title">
                    Teacher
                  </h2>
                  <div className="search-container">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search skills"
                      value={searchTeacher}
                      onChange={(e) => setSearchTeacher(e.target.value)}
                    />
                    {searchTeacher && (
                      <button
                        className="clear-search"
                        onClick={() => setSearchTeacher('')}
                      >
                        {React.createElement(CloseIcon)}
                      </button>
                    )}
                  </div>
                  <div className="skills-list">
                    {filteredTeacherSkills.map((skill, index) => (
                      <div key={index} className="skill-item profile2-skill-item">
                        <span className="skill-name">
                          {skill.skillArea}
                        </span>
                        <input
                          type="text"
                          className="profile2-score-input teacher-score-input"
                          value={teacherEvaluations[skill.skillArea] || ''}
                          readOnly
                          placeholder="—"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="profile3-submit-button-container">
                {!isStudentEditMode ? (
                  <button
                    className="profile2-request-evaluation-button"
                    type="button"
                    onClick={handleEnterStudentEditMode}
                    disabled={!confirmedRubricId || !selectedRubricData}
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      className="profile2-request-evaluation-button"
                      type="button"
                      onClick={handleCancelStudentEdits}
                    >
                      Cancel
                    </button>
                    <button
                      className="profile2-request-evaluation-button"
                      type="button"
                      onClick={handleSaveStudentEdits}
                    >
                      Save
                    </button>
                    <button
                      className="profile2-request-evaluation-button"
                      type="button"
                      onClick={handleDoneStudentEditing}
                    >
                      Done Editing
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="evaluation-content">
              <p className="evaluation-message">No evaluation results available yet.</p>
              <p className="evaluation-submessage">Select a rubric score to see evaluation results.</p>
            </div>
          )}
        </div>
      </div>

      {isRubricInfoOpen && (
        <div
          className="modal-overlay"
          onClick={handleCloseRubricInfo}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '900px', width: '95%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">
              {rubricInfoData?.title || 'Rubric Details'}
            </h2>

            {isRubricInfoLoading && (
              <div className="evaluation-content">
                <p className="evaluation-message">Loading rubric table...</p>
              </div>
            )}

            {!isRubricInfoLoading && rubricInfoError && (
              <div className="evaluation-content">
                <p className="evaluation-message">{rubricInfoError}</p>
              </div>
            )}

            {!isRubricInfoLoading && !rubricInfoError && rubricInfoData && (
              <div className="evaluation-table-container">
                <table className="evaluation-table">
                  <thead>
                    <tr>
                      <th className="evaluation-table-header">Skill Area</th>
                      {rubricInfoData.headers.map((header, index) => (
                        <th key={index} className="evaluation-table-header">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rubricInfoData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <th className="evaluation-table-row-header">
                          {row.skillArea}
                        </th>
                        {row.values.map((value, valueIndex) => (
                          <td
                            key={valueIndex}
                            className="evaluation-table-cell"
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-buttons">
              <button
                type="button"
                className="modal-button modal-button-cancel"
                onClick={handleCloseRubricInfo}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile2;
