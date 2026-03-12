import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Profile.css';
import './RubricScore.css';
import { FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import { getRubricScore, RubricScoreDetail } from '../services/rubricScoreApi';

const PdfIcon = FaFilePdf as React.ComponentType;
const ArrowLeftIcon = FaArrowLeft as React.ComponentType;

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

  const [selectedRubricData, setSelectedRubricData] = useState<RubricScoreDetail | null>(null);
  const [isLoadingRubric, setIsLoadingRubric] = useState<boolean>(false);
  const [teacherScores, setTeacherScores] = useState<{ [skillArea: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Get selected request
  const selectedRequest = useMemo(() => {
    return studentRequests.find(req => req.id === requestId) || null;
  }, [studentRequests, requestId]);

  // Load rubric data when component mounts
  useEffect(() => {
    const loadRubricData = async () => {
      if (!selectedRequest) {
        setSelectedRubricData(null);
        return;
      }

      try {
        setIsLoadingRubric(true);
        const rubricData = await getRubricScore(selectedRequest.rubricId);
        setSelectedRubricData(rubricData);
        
        // Initialize empty scores for all skills
        const initialScores: { [skillArea: string]: string } = {};
        rubricData.rows.forEach((row) => {
          initialScores[row.skillArea] = '';
        });
        setTeacherScores(initialScores);
      } catch (error) {
        console.error('Error loading rubric data:', error);
        setSelectedRubricData(null);
      } finally {
        setIsLoadingRubric(false);
      }
    };

    loadRubricData();
  }, [selectedRequest]);

  // Get skills from selected rubric
  const skills = useMemo(() => {
    if (!selectedRubricData) return [];
    return selectedRubricData.rows.map(row => ({
      skillArea: row.skillArea
    }));
  }, [selectedRubricData]);

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

      {/* Selected Rubric Display */}
      <div className="portfolio-container">
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">Selected Rubric</h2>
          <div className="rubric-display-box">
            {isLoadingRubric ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Loading rubric...</div>
            ) : selectedRubricData ? (
              <div className="rubric-info">
                <h3 className="rubric-title-display">{selectedRubricData.title}</h3>
                <p className="rubric-skills-count">{selectedRubricData.rows.length} skill(s) to evaluate</p>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                Failed to load rubric data.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evaluation Scores Section */}
      {selectedRubricData && (
        <div className="evaluation-container">
          <div className="evaluation-section">
            <h2 className="evaluation-section-title">
              Evaluation Scores
            </h2>

            <div className="evaluation-box">
              <div className="teacher-evaluation-list">
                {skills.map((skill, index) => (
                  <div key={index} className="teacher-evaluation-item">
                    <span className="evaluation-skill-name">{skill.skillArea}</span>
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
                      placeholder="Enter score"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Submit Button - Outside evaluation box, but inside evaluation section */}
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
          </div>
        </div>
      )}
      
      {/* Back Button - Outside evaluation container, as direct child of profile-wrapper */}
      {selectedRubricData && (
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
      )}
    </div>
  );
};

export default Profile3Detail;
