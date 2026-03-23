import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Profile.css';
import './RubricScore.css';
import { FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import { AiOutlineClose, AiOutlineInfoCircle, AiOutlinePlus } from 'react-icons/ai';
import { getRubricScores, getRubricScore, RubricScoreDetail } from '../services/rubricScoreApi';
import RubricScoreTable from './RubricScoreTable';
import { useAppRole } from '../context/AppRoleContext';

const PdfIcon = FaFilePdf as React.ComponentType;
const ArrowLeftIcon = FaArrowLeft as React.ComponentType;
const CloseIcon = AiOutlineClose as React.ComponentType;
const InfoIcon = AiOutlineInfoCircle as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;

interface Skill {
  skillArea: string;
}

interface StudentRequest {
  id: string;
  studentName: string;
  studentId: string;
  portfolioFileName: string;
  portfolioFileUrl?: string;
  rubricId: string;
  rubricTitle: string;
  requestedAt: string;
  status: 'pending' | 'completed';
}

interface TableData {
  skillArea: string;
  values: string[];
}

interface FormerRubricVersion {
  version: string;
  createdAt: string;
  expiresAt: string;
  title: string;
  headers: string[];
  rows: TableData[];
}

const Profile3Detail: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { isStudent, isTeacher } = useAppRole();
  /* Student: AI + self-eval; Teacher: AI + teacher scores (each role hides the other column). */
  const evaluationPanelsGridClass = 'profile2-two-panels';

  // Mock student requests data - replace with API call later
  const [studentRequests] = useState<StudentRequest[]>([
    {
      id: '1',
      studentName: 'John Doe',
      studentId: 'STU001',
      portfolioFileName: 'portfolio_john_doe.pdf',
      rubricId: '2',
      rubricTitle: 'Software Development Skills',
      requestedAt: '2024-01-15T10:30:00Z',
      status: 'pending'
    },
    {
      id: '2',
      studentName: 'Jane Smith',
      studentId: 'STU002',
      portfolioFileName: 'portfolio_jane_smith.pdf',
      rubricId: '1',
      rubricTitle: 'Test Rubric',
      requestedAt: '2024-01-16T14:20:00Z',
      status: 'pending'
    }
  ]);

  // Rubric selection and data
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<{ id: string; title: string }[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [confirmedRubricId, setConfirmedRubricId] = useState<string | null>(null);
  const [selectedRubricData, setSelectedRubricData] = useState<RubricScoreDetail | null>(null);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState<boolean>(true);
  const [isLoadingRubric, setIsLoadingRubric] = useState<boolean>(false);
  const [isRubricInfoOpen, setIsRubricInfoOpen] = useState<boolean>(false);
  const [rubricInfoData, setRubricInfoData] = useState<RubricScoreDetail | null>(null);
  const [isRubricInfoLoading, setIsRubricInfoLoading] = useState<boolean>(false);
  const [rubricInfoError, setRubricInfoError] = useState<string | null>(null);
  const [teacherScores, setTeacherScores] = useState<{ [skillArea: string]: string }>({});
  const [aiEvaluations, setAiEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [studentEvaluations, setStudentEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [teacherExtraSkills, setTeacherExtraSkills] = useState<Skill[]>([]);
  const [isTeacherEditMode, setIsTeacherEditMode] = useState<boolean>(false);
  const [originalTeacherScores, setOriginalTeacherScores] = useState<{ [skillArea: string]: string }>({});
  const [originalTeacherExtraSkills, setOriginalTeacherExtraSkills] = useState<Skill[]>([]);
  const [searchAi, setSearchAi] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [searchTeacher, setSearchTeacher] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRubricHistoryOpen, setIsRubricHistoryOpen] = useState<boolean>(false);
  const [selectedFormerVersion, setSelectedFormerVersion] = useState<FormerRubricVersion | null>(null);

  // Get selected request
  const selectedRequest = useMemo(() => {
    return studentRequests.find(req => req.id === requestId) || null;
  }, [studentRequests, requestId]);

  // Auto-select rubric from the student request.
  useEffect(() => {
    if (!selectedRequest?.rubricId) return;
    setSelectedRubricId(selectedRequest.rubricId);
    setConfirmedRubricId(selectedRequest.rubricId);
  }, [selectedRequest]);

  // Load rubric list on mount
  useEffect(() => {
    const loadRubrics = async () => {
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
    loadRubrics();
  }, []);

  // Load rubric data when confirmed rubric changes
  useEffect(() => {
    const loadRubricData = async () => {
      if (!confirmedRubricId) {
        setSelectedRubricData(null);
        setTeacherScores({});
        setAiEvaluations({});
        setStudentEvaluations({});
        setTeacherExtraSkills([]);
        setIsTeacherEditMode(false);
        return;
      }

      try {
        setIsLoadingRubric(true);
        const rubricData = await getRubricScore(confirmedRubricId);
        setSelectedRubricData(rubricData);

        const generateRandomLevel = () => Math.floor(Math.random() * 5) + 1;
        const newTeacher: { [skillArea: string]: string } = {};
        const newAi: { [skillArea: string]: string } = {};
        const newStudent: { [skillArea: string]: string } = {};
        rubricData.rows.forEach((row) => {
          const skillArea = row.skillArea;
          newTeacher[skillArea] = '';
          newAi[skillArea] = String(generateRandomLevel());
          newStudent[skillArea] = ''; // placeholder until student data is available
        });
        setTeacherScores(newTeacher);
        setAiEvaluations(newAi);
        setStudentEvaluations(newStudent);
        setTeacherExtraSkills([]);
        setIsTeacherEditMode(false);
      } catch (error) {
        console.error('Error loading rubric data:', error);
        setSelectedRubricData(null);
        setTeacherScores({});
        setAiEvaluations({});
        setStudentEvaluations({});
        setTeacherExtraSkills([]);
        setIsTeacherEditMode(false);
      } finally {
        setIsLoadingRubric(false);
      }
    };

    loadRubricData();
  }, [confirmedRubricId]);

  const filteredRubricScores = useMemo(() => {
    if (!searchQuery.trim()) return rubricScores;
    const query = searchQuery.toLowerCase();
    return rubricScores.filter(rubric =>
      rubric.title.toLowerCase().includes(query)
    );
  }, [rubricScores, searchQuery]);

  const formerRubricVersions = useMemo<FormerRubricVersion[]>(() => {
    if (!selectedRubricData) return [];
    const now = new Date();
    const iso = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);
    const d1 = new Date(now);
    d1.setDate(d1.getDate() + 2);
    d1.setHours(23, 59, 59, 0);
    const d2 = new Date(now);
    d2.setDate(d2.getDate() + 10);
    d2.setHours(23, 59, 59, 0);

    const fullHeaders = selectedRubricData.headers;
    const trimmedHeaders =
      fullHeaders.length > 1 ? fullHeaders.slice(0, fullHeaders.length - 1) : fullHeaders;

    const buildRows = (headersToUse: string[]): TableData[] =>
      selectedRubricData.rows.map((r) => ({
        skillArea: r.skillArea,
        values: r.values.slice(0, headersToUse.length),
      }));

    return [
      {
        version: 'v1',
        title: `${selectedRubricData.title} (v1)`,
        createdAt: iso(new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)),
        expiresAt: iso(d1),
        headers: trimmedHeaders,
        rows: buildRows(trimmedHeaders),
      },
      {
        version: 'v2',
        title: `${selectedRubricData.title} (v2)`,
        createdAt: iso(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
        expiresAt: iso(d2),
        headers: fullHeaders,
        rows: buildRows(fullHeaders),
      },
    ];
  }, [selectedRubricData]);

  const handleRubricSelect = (rubricId: string) => {
    setSelectedRubricId(rubricId);
  };

  const handleConfirmRubric = () => {
    if (!selectedRubricId) return;
    setConfirmedRubricId(selectedRubricId);
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
      setRubricInfoError(error?.message || 'Failed to load rubric details. Please try again.');
    } finally {
      setIsRubricInfoLoading(false);
    }
  };

  const handleCloseRubricInfo = () => {
    setIsRubricInfoOpen(false);
  };

  const handleCloseRubricHistory = () => {
    setIsRubricHistoryOpen(false);
    setSelectedFormerVersion(null);
  };

  const handleEditRubricFromInfo = () => {
    if (!rubricInfoData?.id) return;
    navigate(`/rubric_score/${rubricInfoData.id}`);
  };

  // Get skills from selected rubric
  const skills = useMemo((): Skill[] => {
    if (!selectedRubricData) return [];
    return selectedRubricData.rows.map(row => ({
      skillArea: row.skillArea
    }));
  }, [selectedRubricData]);

  const teacherSkillsAll = useMemo((): Skill[] => {
    return [...skills, ...teacherExtraSkills];
  }, [skills, teacherExtraSkills]);

  const filteredAiSkills = useMemo(() => {
    if (!searchAi.trim()) return skills;
    const query = searchAi.toLowerCase();
    return skills.filter(skill => skill.skillArea.toLowerCase().includes(query));
  }, [skills, searchAi]);

  const filteredStudentSkills = useMemo(() => {
    if (!searchStudent.trim()) return skills;
    const query = searchStudent.toLowerCase();
    return skills.filter(skill => skill.skillArea.toLowerCase().includes(query));
  }, [skills, searchStudent]);

  const filteredTeacherSkills = useMemo(() => {
    if (!searchTeacher.trim()) return teacherSkillsAll;
    const query = searchTeacher.toLowerCase();
    return teacherSkillsAll.filter(skill => skill.skillArea.toLowerCase().includes(query));
  }, [teacherSkillsAll, searchTeacher]);

  const handleAddTeacherSkill = () => {
    const base = 'New Skill';
    const existing = new Set(teacherSkillsAll.map((s) => s.skillArea));
    let nextName = base;
    let i = 2;
    while (existing.has(nextName)) {
      nextName = `${base} ${i}`;
      i += 1;
    }

    setTeacherExtraSkills((prev) => [...prev, { skillArea: nextName }]);
    setTeacherScores((prev) => ({ ...prev, [nextName]: '' }));
  };

  const handleDeleteTeacherCustomSkill = (skillArea: string) => {
    setTeacherExtraSkills((prev) => prev.filter((s) => s.skillArea !== skillArea));
    setTeacherScores((prev) => {
      const next = { ...prev };
      delete next[skillArea];
      return next;
    });
  };

  const handleRenameTeacherCustomSkill = (oldSkillArea: string, nextSkillAreaRaw: string) => {
    const nextSkillArea = nextSkillAreaRaw.trim();
    if (!nextSkillArea || nextSkillArea === oldSkillArea) return;

    const existing = new Set(teacherSkillsAll.map((s) => s.skillArea));
    existing.delete(oldSkillArea);

    if (existing.has(nextSkillArea)) {
      alert('That skill name already exists.');
      return;
    }

    setTeacherExtraSkills((prev) =>
      prev.map((s) => (s.skillArea === oldSkillArea ? { ...s, skillArea: nextSkillArea } : s))
    );
    setTeacherScores((prev) => {
      const next = { ...prev };
      const oldVal = next[oldSkillArea] ?? '';
      delete next[oldSkillArea];
      next[nextSkillArea] = oldVal;
      return next;
    });
  };

  const handleEnterTeacherEditMode = () => {
    setOriginalTeacherScores({ ...teacherScores });
    setOriginalTeacherExtraSkills(teacherExtraSkills.map((s) => ({ ...s })));
    setIsTeacherEditMode(true);
  };

  const handleSaveTeacherEdits = () => {
    // Save current edits as the new baseline, stay in edit mode
    setOriginalTeacherScores({ ...teacherScores });
    setOriginalTeacherExtraSkills(teacherExtraSkills.map((s) => ({ ...s })));
  };

  const handleCancelTeacherEdits = () => {
    setTeacherScores({ ...originalTeacherScores });
    setTeacherExtraSkills(originalTeacherExtraSkills.map((s) => ({ ...s })));
    setIsTeacherEditMode(false);
  };

  const handleDoneTeacherEditing = () => {
    setIsTeacherEditMode(false);
  };

  const handleScoreChange = (skillArea: string, value: string) => {
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setTeacherScores(prev => ({
        ...prev,
        [skillArea]: value
      }));
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedRequest || !selectedRubricData) return;

    // Validate that all skills have scores
    const missingScores = skills.filter(skill => !teacherScores[skill.skillArea] || teacherScores[skill.skillArea].trim() === '');
    if (missingScores.length > 0) {
      alert(`Please fill in scores for all skills. Missing: ${missingScores.map(s => s.skillArea).join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);
      // TODO: Replace with actual API call
      console.log('Submitting evaluation:', {
        requestId: selectedRequest.id,
        studentId: selectedRequest.studentId,
        scores: teacherScores
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      alert('Evaluation submitted successfully!');
      
      // Navigate back to list
      navigate('/profile3');
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert('Failed to submit evaluation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!selectedRequest) {
    return (
      <div className="profile-wrapper">
        <div className="portfolio-container">
          <div className="portfolio-section">
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <p>Student request not found.</p>
              <button
                className="profile2-request-evaluation-button"
                onClick={() => navigate('/profile3')}
                style={{ marginTop: '20px' }}
              >
                Back to Requests
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrapper">
      {/* Header */}
      <div className="portfolio-container">
        <div className="portfolio-section" style={{ textAlign: 'left' }}>
          <div className="student-request-header-info" style={{ textAlign: 'left', width: '100%' }}>
            <h2 className="portfolio-section-title" style={{ margin: 0, textAlign: 'left', width: '100%' }}>
              {selectedRequest.studentName}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px', paddingLeft: 0, textAlign: 'left', width: '100%' }}>
              Requested: {formatDate(selectedRequest.requestedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Display Section */}
      <div className="portfolio-container">
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">Student Portfolio</h2>
          <div className="portfolio-display-box profile3-student-portfolio-box">
            <div className="portfolio-file-display">
              <div className="portfolio-file-icon">
                {React.createElement(PdfIcon)}
              </div>
              <div className="portfolio-file-info">
                <p className="portfolio-file-name">{selectedRequest.portfolioFileName}</p>
                <p className="portfolio-file-meta">PDF Document</p>
              </div>
              <button
                className="portfolio-view-button"
                onClick={() => {
                  // TODO: Open portfolio file
                  alert('Portfolio viewer will open here');
                }}
              >
                View Portfolio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Results Section - AI, Student, Teacher (only Teacher editable) */}
      <div className="evaluation-container">
        <div className="evaluation-section">
          <div className="evaluation-header-container">
            <h2 className="evaluation-section-title">
              Evaluation Results
              {selectedRubricData && (
                <span className="evaluation-section-title-rubric">
                  {' '}
                  — {selectedRubricData.title}
                </span>
              )}
            </h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }} />
          </div>

          {isLoadingRubric ? (
            <div className="evaluation-content">
              <p className="evaluation-message">Loading rubric...</p>
            </div>
          ) : !selectedRubricData ? (
            <div className="evaluation-content">
              <p className="evaluation-message">No evaluation results available yet.</p>
              <p className="evaluation-submessage">
                Select and confirm a rubric score to see evaluation results.
              </p>
            </div>
          ) : skills.length === 0 ? (
            <div className="evaluation-content">
              <p className="evaluation-message">No skills available for this rubric.</p>
            </div>
          ) : (
            <>
              <div className={`skills-panels-container ${evaluationPanelsGridClass}`}>
                  <div className="skills-panel profile2-panel">
                    <h2 className="panel-title">AI</h2>
                    <div className="search-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search skills"
                        value={searchAi}
                        onChange={(e) => setSearchAi(e.target.value)}
                      />
                      {searchAi && (
                        <button className="clear-search" onClick={() => setSearchAi('')}>
                          {React.createElement(CloseIcon)}
                        </button>
                      )}
                    </div>
                    <div className="skills-list">
                      {filteredAiSkills.map((skill, index) => (
                        <div key={index} className="skill-item profile2-skill-item">
                          <span className="skill-name">{skill.skillArea}</span>
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
                  {!isTeacher && (
                  <div className="skills-panel profile2-panel">
                    <h2 className="panel-title">Student</h2>
                    <div className="search-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search skills"
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                      />
                      {searchStudent && (
                        <button className="clear-search" onClick={() => setSearchStudent('')}>
                          {React.createElement(CloseIcon)}
                        </button>
                      )}
                    </div>
                    <div className="skills-list">
                      {filteredStudentSkills.map((skill, index) => (
                        <div key={index} className="skill-item profile2-skill-item">
                          <span className="skill-name">{skill.skillArea}</span>
                          <input
                            type="text"
                            className="profile2-score-input ai-score-input"
                            value={studentEvaluations[skill.skillArea] || ''}
                            readOnly
                            placeholder="—"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                  {!isStudent && (
                  <div className="skills-panel profile2-panel">
                    <h2 className="panel-title">Teacher</h2>
                    <div className="search-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search skills"
                        value={searchTeacher}
                        onChange={(e) => setSearchTeacher(e.target.value)}
                      />
                      {searchTeacher && (
                        <button className="clear-search" onClick={() => setSearchTeacher('')}>
                          {React.createElement(CloseIcon)}
                        </button>
                      )}
                    </div>
                    <div className="skills-list">
                      {filteredTeacherSkills.map((skill, index) => (
                        <div key={index} className="skill-item profile2-skill-item profile2-skill-item-deletable">
                          {isTeacherEditMode &&
                            teacherExtraSkills.some((s) => s.skillArea === skill.skillArea) && (
                              <button
                                type="button"
                                className="profile2-skill-delete-button"
                                title="Remove skill"
                                aria-label="Remove skill"
                                onClick={() => handleDeleteTeacherCustomSkill(skill.skillArea)}
                              >
                                {React.createElement(CloseIcon)}
                              </button>
                            )}
                          {isTeacherEditMode &&
                          teacherExtraSkills.some((s) => s.skillArea === skill.skillArea) ? (
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
                              onBlur={(e) => handleRenameTeacherCustomSkill(skill.skillArea, e.target.value)}
                            />
                          ) : (
                            <span className="skill-name">{skill.skillArea}</span>
                          )}
                          <input
                            type="text"
                            className="profile2-score-input teacher-score-input"
                            value={teacherScores[skill.skillArea] || ''}
                            readOnly={!isTeacherEditMode}
                            onChange={
                              !isTeacherEditMode
                                ? undefined
                                : (e) => handleScoreChange(skill.skillArea, e.target.value)
                            }
                            onBlur={
                              !isTeacherEditMode
                                ? undefined
                                : (e) => {
                                    const value = e.target.value;
                                    if (value && (!/^\d+$/.test(value) || parseInt(value) < 1)) {
                                      setTeacherScores(prev => ({
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
                      {isTeacherEditMode && (
                        <div
                          className="rubric-score-add-box"
                          onClick={handleAddTeacherSkill}
                          title="Add Skill"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleAddTeacherSkill();
                            }
                          }}
                        >
                          <span className="rubric-score-add-box-spacer"></span>
                          <button
                            className="rubric-score-add-box-button"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddTeacherSkill();
                            }}
                            title="Add Skill"
                          >
                            {React.createElement(PlusIcon)}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
              </div>

                {!isStudent && (
                <div className="profile3-submit-button-container">
                  {!isTeacherEditMode ? (
                    <button
                      className="profile2-request-evaluation-button"
                      type="button"
                      onClick={handleEnterTeacherEditMode}
                      disabled={!selectedRubricData}
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        className="profile2-request-evaluation-button"
                        type="button"
                        onClick={handleCancelTeacherEdits}
                      >
                        Cancel
                      </button>
                      <button
                        className="profile2-request-evaluation-button"
                        type="button"
                        onClick={handleSaveTeacherEdits}
                      >
                        Save
                      </button>
                      <button
                        className="profile2-request-evaluation-button"
                        type="button"
                        onClick={handleDoneTeacherEditing}
                      >
                        Done Editing
                      </button>
                    </>
                  )}
                </div>
                )}
              </>
            )}
        </div>
      </div>
      
      {/* Back Button - Outside evaluation container, as direct child of profile-wrapper */}
      <div className="profile3-back-button-container">
        <button
          className="profile3-back-button"
          onClick={() => navigate('/profile3')}
        >
          <span className="back-button-icon">
            {React.createElement(ArrowLeftIcon)}
          </span>
          <span>Back to Requests</span>
        </button>
        {!isStudent && (
        <button
          className="profile2-request-evaluation-button"
          type="button"
          onClick={handleSubmitEvaluation}
          disabled={isSubmitting || isTeacherEditMode}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
        </button>
        )}
      </div>

      {/* Rubric info modal - view only */}
      {isRubricInfoOpen && (
        <div className="modal-overlay" onClick={handleCloseRubricInfo}>
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
                          <td key={valueIndex} className="evaluation-table-cell">
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
                className="modal-button modal-button-apply"
                onClick={handleEditRubricFromInfo}
              >
                Edit Rubric Score
              </button>
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

      {/* Rubric history popup (mock UI) */}
      {isRubricHistoryOpen && (
        <div className="rubric-modal-overlay" onClick={handleCloseRubricHistory}>
          <div className="rubric-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rubric-modal-header">
              <h2 className="rubric-modal-title">
                {selectedFormerVersion ? 'Former rubric detail' : 'Former rubric versions'}
              </h2>
              <button
                type="button"
                className="rubric-modal-close"
                onClick={handleCloseRubricHistory}
                aria-label="Close"
                title="Close"
              >
                {React.createElement(CloseIcon)}
              </button>
            </div>

            {selectedFormerVersion ? (
              <>
                <div className="rubric-history-detail-meta">
                  <div>Name: {selectedFormerVersion.title}</div>
                  <div>Created: {selectedFormerVersion.createdAt}</div>
                  <div>Expires: {selectedFormerVersion.expiresAt}</div>
                </div>

                <RubricScoreTable
                  headers={selectedFormerVersion.headers}
                  rows={selectedFormerVersion.rows}
                  onHeadersChange={() => {}}
                  onRowsChange={() => {}}
                  readOnly={true}
                />

                <div className="rubric-modal-actions">
                  <button
                    type="button"
                    className="rubric-modal-button secondary"
                    onClick={() => setSelectedFormerVersion(null)}
                  >
                    Back to versions
                  </button>
                  <button
                    type="button"
                    className="rubric-modal-button"
                    onClick={handleCloseRubricHistory}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rubric-history-list">
                  {formerRubricVersions.map((item) => (
                    <button
                      key={item.version}
                      type="button"
                      className="rubric-history-item rubric-history-item-button"
                      onClick={() => {
                        if (!confirmedRubricId) return;
                        navigate('/rubric_version_detail', {
                          state: {
                            portfolioUsedFileName: selectedRequest?.portfolioFileName || 'portfolio.pdf',
                            rubricId: confirmedRubricId,
                            rubricVersion: item,
                          },
                        });
                      }}
                    >
                      <div className="rubric-history-left">
                        <div className="rubric-history-version">{item.version}</div>
                        <div className="rubric-history-meta">Created: {item.createdAt}</div>
                      </div>
                      <div className="rubric-history-right">
                        <div className="rubric-history-exp">Expires: {item.expiresAt}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="rubric-modal-actions">
                  <button
                    type="button"
                    className="rubric-modal-button"
                    onClick={handleCloseRubricHistory}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile3Detail;
