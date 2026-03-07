import React, { useState, useRef, useMemo, useEffect } from 'react';
import './Profile.css';
import './RubricScore.css';
import { AiOutlineClose } from 'react-icons/ai';
import { FaBriefcase } from 'react-icons/fa';
import { importPortfolio } from '../services/portfolioApi';
import { getRubricScores, getRubricScore, RubricScoreDetail } from '../services/rubricScoreApi';

const CloseIcon = AiOutlineClose as React.ComponentType;
const BriefcaseIcon = FaBriefcase as React.ComponentType;

const Profile2: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Rubric Score section state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<{ id: string; title: string }[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [selectedRubricData, setSelectedRubricData] = useState<RubricScoreDetail | null>(null);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState<boolean>(true);
  const [isLoadingRubricData, setIsLoadingRubricData] = useState<boolean>(false);

  // Evaluation results state
  const [teacherEvaluations, setTeacherEvaluations] = useState<{ [skillId: string]: number }>({});
  const [aiEvaluations, setAiEvaluations] = useState<{ [skillId: string]: number }>({});
  const [studentEvaluations, setStudentEvaluations] = useState<{ [skillId: string]: string }>({});

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

  // Load selected rubric data
  useEffect(() => {
    const loadRubricData = async () => {
      if (!selectedRubricId) {
        setSelectedRubricData(null);
        return;
      }

      try {
        setIsLoadingRubricData(true);
        const rubricData = await getRubricScore(selectedRubricId);
        setSelectedRubricData(rubricData);
        
        // Initialize evaluations with random values for teacher and AI
        const generateRandomLevel = () => Math.floor(Math.random() * 5) + 1;
        const newTeacherValues: { [skillId: string]: number } = {};
        const newAiValues: { [skillId: string]: number } = {};
        
        rubricData.headers.forEach((header, index) => {
          const skillId = `skill-${index}`;
          newTeacherValues[skillId] = generateRandomLevel();
          newAiValues[skillId] = hasPortfolioFiles ? generateRandomLevel() : 0;
        });
        
        setTeacherEvaluations(newTeacherValues);
        setAiEvaluations(newAiValues);
      } catch (error) {
        console.error('Error loading rubric data:', error);
        setSelectedRubricData(null);
      } finally {
        setIsLoadingRubricData(false);
      }
    };

    loadRubricData();
  }, [selectedRubricId]);

  const hasPortfolioFiles = useMemo(() => {
    return uploadedFiles.length > 0;
  }, [uploadedFiles]);

  // Update AI evaluations when portfolio files change
  useEffect(() => {
    if (!selectedRubricData) return;

    if (hasPortfolioFiles) {
      const generateRandomLevel = () => Math.floor(Math.random() * 5) + 1;
      setAiEvaluations(prev => {
        const newAiValues: { [skillId: string]: number } = {};
        selectedRubricData.headers.forEach((header, index) => {
          const skillId = `skill-${index}`;
          // Preserve existing value or generate new one
          newAiValues[skillId] = prev[skillId] || generateRandomLevel();
        });
        return newAiValues;
      });
    } else {
      // Clear AI evaluations if no portfolio files
      const newAiValues: { [skillId: string]: number } = {};
      selectedRubricData.headers.forEach((header, index) => {
        const skillId = `skill-${index}`;
        newAiValues[skillId] = 0;
      });
      setAiEvaluations(newAiValues);
    }
  }, [hasPortfolioFiles, selectedRubricData]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const pdfFiles = fileArray.filter(file => file.name.toLowerCase().endsWith('.pdf'));
      
      if (pdfFiles.length === 0 && fileArray.length > 0) {
        console.warn('Please upload PDF files only. The backend only accepts PDF format.');
        return;
      }

      // Add new files to the uploaded files list
      setUploadedFiles(prev => [...prev, ...pdfFiles]);
      
      try {
        const result = await importPortfolio(
          'portfolio-general',
          'General Portfolio',
          pdfFiles
        );
        console.log('Portfolio import successful:', result);
      } catch (error: any) {
        console.error('Error importing portfolio:', error);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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

  // Prepare evaluation data for display
  const evaluationData = useMemo(() => {
    if (!selectedRubricData || selectedRubricData.headers.length === 0) {
      return [];
    }

    const teacherLevels = selectedRubricData.headers.map((header, index) => {
      const skillId = `skill-${index}`;
      return teacherEvaluations[skillId] || '-';
    });

    const aiLevels = selectedRubricData.headers.map((header, index) => {
      const skillId = `skill-${index}`;
      if (!hasPortfolioFiles) {
        return '-';
      }
      return aiEvaluations[skillId] || '-';
    });

    const studentLevels = selectedRubricData.headers.map((header, index) => {
      const skillId = `skill-${index}`;
      const storedValue = studentEvaluations[skillId];
      return storedValue !== undefined ? storedValue : '-';
    });

    return [
      { evaluator: 'Teacher', levels: teacherLevels },
      { evaluator: 'AI', levels: aiLevels },
      { evaluator: 'Student (You)', levels: studentLevels },
    ];
  }, [selectedRubricData, teacherEvaluations, aiEvaluations, studentEvaluations, hasPortfolioFiles]);

  return (
    <div className="profile-wrapper">
      {/* Your Profile Section */}
      <div className="portfolio-container">
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">Your Profile</h2>
          <div className="profile-upload-container">
            {/* Upload Portfolio Card */}
            <div className="profile-upload-card">
              <div className="portfolio-box-icon">
                {React.createElement(BriefcaseIcon)}
              </div>
              <input
                ref={(el) => (fileInputRef.current = el)}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".pdf"
              />
              <button
                className="portfolio-upload-button"
                onClick={handleUploadClick}
              >
                Upload Portfolio
              </button>
            </div>

            {/* Uploaded Files Card */}
            <div className="profile-uploaded-files-card">
              <h3 className="uploaded-files-title">Uploaded Files</h3>
              {uploadedFiles.length > 0 ? (
                <ul className="uploaded-files-list">
                  {uploadedFiles.map((file, index) => (
                    <li key={index} className="uploaded-file-item">
                      <span className="file-name">
                        <span className="file-icon">📄</span>
                        {file.name}
                      </span>
                      <button
                        className="file-delete-button"
                        onClick={() => handleRemoveFile(index)}
                        title="Remove file"
                      >
                        {React.createElement(CloseIcon)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-files-message">No files uploaded yet</p>
              )}
            </div>
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
                className={`rubric-score-bar ${selectedRubricId === rubric.id ? 'selected' : ''}`}
                onClick={() => handleRubricSelect(rubric.id)}
                style={{
                  backgroundColor: selectedRubricId === rubric.id ? 'rgba(178, 187, 30, 0.8)' : '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <span className="rubric-score-bar-title">{rubric.title}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Evaluation Results Section */}
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
            <div className="evaluation-box">
              {isLoadingRubricData ? (
                <div className="evaluation-content">
                  <p className="evaluation-message">Loading rubric data...</p>
                </div>
              ) : selectedRubricData && selectedRubricData.headers.length > 0 ? (
                <div className="evaluation-table-container">
                  <table className="evaluation-table">
                    <thead>
                      <tr>
                        <th className="evaluation-table-header">Evaluator</th>
                        {selectedRubricData.headers.map((header, index) => (
                          <th key={index} className="evaluation-table-header">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evaluationData.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td className="evaluation-table-row-header">{row.evaluator}</td>
                          {row.levels.map((level, colIndex) => {
                            const isStudentRow = row.evaluator === 'Student (You)';
                            const skillId = `skill-${colIndex}`;
                            const currentValue = isStudentRow 
                              ? (studentEvaluations[skillId] !== undefined ? studentEvaluations[skillId] : level)
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
                                          [skillId]: e.key
                                        }));
                                      }
                                    }}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (currentValue === '-' && value.length > 0 && /^[1-9]\d*$/.test(value)) {
                                        setStudentEvaluations(prev => ({
                                          ...prev,
                                          [skillId]: value
                                        }));
                                      }
                                      else if (value === '' || value === '-' || /^[1-9]\d*$/.test(value)) {
                                        setStudentEvaluations(prev => ({
                                          ...prev,
                                          [skillId]: value
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
                                          [skillId]: '-'
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
                  <p className="evaluation-submessage">Select a rubric score to see evaluation results.</p>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};

export default Profile2;
