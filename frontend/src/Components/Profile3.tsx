import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import './RubricScore.css';
import { AiOutlineClose } from 'react-icons/ai';

const CloseIcon = AiOutlineClose as React.ComponentType;

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

const Profile3: React.FC = () => {
  const navigate = useNavigate();
  const [searchStudentName, setSearchStudentName] = useState<string>('');

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
      status: 'pending',
    },
    {
      id: '2',
      studentName: 'Jane Smith',
      studentId: 'STU002',
      portfolioFileName: 'portfolio_jane_smith.pdf',
      rubricId: '1',
      rubricTitle: 'Test Rubric',
      requestedAt: '2024-01-16T14:20:00Z',
      status: 'pending',
    },
  ]);

  const handleCardClick = (requestId: string) => {
    navigate(`/profile3/${requestId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRequests = useMemo(() => {
    const q = searchStudentName.trim().toLowerCase();
    if (!q) return studentRequests;
    return studentRequests.filter((req) =>
      req.studentName.toLowerCase().includes(q)
    );
  }, [studentRequests, searchStudentName]);

  return (
    <div className="profile-wrapper">
      {/* Student Evaluation Requests Section */}
      <div className="portfolio-container">
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">Student Evaluation Requests</h2>

          <div className="rubric-score-search-container" style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="rubric-score-search-input"
              placeholder="Search student name"
              value={searchStudentName}
              onChange={(e) => setSearchStudentName(e.target.value)}
            />
            {searchStudentName && (
              <button
                className="rubric-score-clear-search"
                onClick={() => setSearchStudentName('')}
                type="button"
                aria-label="Clear search"
                title="Clear"
              >
                {React.createElement(CloseIcon)}
              </button>
            )}
          </div>

          {filteredRequests.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <p>
                {studentRequests.length === 0
                  ? 'No student evaluation requests available.'
                  : 'No matching students found.'}
              </p>
            </div>
          ) : (
            <div className="student-requests-list">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className={`student-request-card ${request.status === 'completed' ? 'completed' : ''}`}
                  onClick={() => handleCardClick(request.id)}
                >
                  <div className="student-request-header">
                    <div className="student-request-info">
                      <h3 className="student-name">{request.studentName}</h3>
                    </div>
                    <div className="student-request-status">
                      <span className={`status-badge ${request.status}`}>
                        {request.status === 'pending' ? 'Pending' : 'Completed'}
                      </span>
                    </div>
                  </div>
                  <div className="student-request-details">
                    <div className="request-detail-item">
                      <span className="detail-label">Rubric:</span>
                      <span className="detail-value">{request.rubricTitle}</span>
                    </div>
                    <div className="request-detail-item">
                      <span className="detail-label">Portfolio:</span>
                      <span className="detail-value">{request.portfolioFileName}</span>
                    </div>
                    <div className="request-detail-item">
                      <span className="detail-label">Requested:</span>
                      <span className="detail-value">{formatDate(request.requestedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile3;
