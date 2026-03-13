import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Profile.css';
import './RubricScore.css';
import { FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import { AiOutlineClose, AiOutlineInfoCircle } from 'react-icons/ai';
import { getRubricScores, getRubricScore, RubricScoreDetail } from '../services/rubricScoreApi';

const PdfIcon = FaFilePdf as React.ComponentType;
const ArrowLeftIcon = FaArrowLeft as React.ComponentType;
const CloseIcon = AiOutlineClose as React.ComponentType;
const InfoIcon = AiOutlineInfoCircle as React.ComponentType;

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

const Profile3Detail: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  
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
  const [searchAi, setSearchAi] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [searchTeacher, setSearchTeacher] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Get selected request
  const selectedRequest = useMemo(() => {
    return studentRequests.find(req => req.id === requestId) || null;
  }, [studentRequests, requestId]);

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
      } catch (error) {
        console.error('Error loading rubric data:', error);
        setSelectedRubricData(null);
        setTeacherScores({});
        setAiEvaluations({});
        setStudentEvaluations({});
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

  const handleEditRubricFromInfo = () => {
    if (!rubricInfoData?.id) return;
    navigate(`/rubric_score/${rubricInfoData.id}`);
  };

  // Get skills from selected rubric
  const skills = useMemo(() => {
    if (!selectedRubricData) return [];
    return selectedRubricData.rows.map(row => ({
      skillArea: row.skillArea
    }));
  }, [selectedRubricData]);

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
    if (!searchTeacher.trim()) return skills;
    const query = searchTeacher.toLowerCase();
    return skills.filter(skill => skill.skillArea.toLowerCase().includes(query));
  }, [skills, searchTeacher]);

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
          <div className="portfolio-display-box">
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

      {/* Choose Rubric Score for this request */}
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
                  position: 'relative',
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
            disabled={!selectedRubricId || selectedRubricId === confirmedRubricId}
          >
            Confirm Selection
          </button>
        </div>
      </div>

      {/* Evaluation Results Section - AI, Student, Teacher (only Teacher editable) */}
      <div className="evaluation-container">
        <div className="evaluation-section">
          <h2 className="evaluation-section-title">
            Evaluation Results
            {selectedRubricData && (
              <span style={{ fontSize: '18px', fontWeight: 'normal', marginLeft: '10px', color: '#666' }}>
                - {selectedRubricData.title}
              </span>
            )}
          </h2>

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
              <div className="skills-panels-container profile2-three-panels">
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
                        <div key={index} className="skill-item profile2-skill-item">
                          <span className="skill-name">{skill.skillArea}</span>
                          <input
                            type="text"
                            className="profile2-score-input teacher-score-input"
                            value={teacherScores[skill.skillArea] || ''}
                            onChange={(e) => handleScoreChange(skill.skillArea, e.target.value)}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value && (!/^\d+$/.test(value) || parseInt(value) < 1)) {
                                setTeacherScores(prev => ({
                                  ...prev,
                                  [skill.skillArea]: ''
                                }));
                              }
                            }}
                            placeholder="Score"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="profile3-submit-button-container">
                  <button
                    className="profile2-request-evaluation-button"
                    type="button"
                    onClick={handleSubmitEvaluation}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                  </button>
                </div>
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
    </div>
  );
};

export default Profile3Detail;
