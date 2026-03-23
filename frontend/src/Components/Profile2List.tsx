import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Profile.css';
import './RubricScore.css';
import { AiOutlineClose, AiOutlineDelete, AiOutlinePlus } from 'react-icons/ai';

const CloseIcon = AiOutlineClose as React.ComponentType;
const DeleteIcon = AiOutlineDelete as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;

interface StudentEvaluationItem {
  id: string;
  title: string;
  rubricTitle: string;
  portfolioFileName: string;
  requestedAt: string;
  status: 'pending' | 'completed';
  /** New card from "+" — rubric/portfolio/date not chosen yet (dashed UI). */
  detailsUnset?: boolean;
}

const Profile2List: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTitle, setSearchTitle] = useState<string>('');

  // Mock data (replace with API later)
  const [evaluations, setEvaluations] = useState<StudentEvaluationItem[]>([]);

  useEffect(() => {
    const state = location.state as { removeEvaluationId?: string } | null;
    const id = state?.removeEvaluationId;
    if (!id) return;
    setEvaluations((prev) => prev.filter((item) => item.id !== id));
    navigate('/profile2', { replace: true, state: {} });
  }, [location.state, navigate]);

  const filteredEvaluations = useMemo(() => {
    const q = searchTitle.trim().toLowerCase();
    if (!q) return evaluations;
    return evaluations.filter((item) => item.title.toLowerCase().includes(q));
  }, [evaluations, searchTitle]);

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

  const handleAddEvaluationItem = () => {
    const baseTitle = 'New Evaluation';
    const existingTitles = new Set(evaluations.map((e) => e.title));
    let nextTitle = baseTitle;
    let i = 2;
    while (existingTitles.has(nextTitle)) {
      nextTitle = `${baseTitle} ${i}`;
      i += 1;
    }

    const nextId = String(Date.now());
    const nextItem: StudentEvaluationItem = {
      id: nextId,
      title: nextTitle,
      rubricTitle: '',
      portfolioFileName: '',
      requestedAt: '',
      status: 'pending',
      detailsUnset: true,
    };

    setEvaluations((prev) => [nextItem, ...prev]);
  };

  const handleDeleteEvaluationItem = (id: string) => {
    setEvaluations((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="rubric-score-wrapper">
      <div className="rubric-score-container">
        <h1 className="rubric-score-title">Your Evaluation</h1>

          <div className="rubric-score-search-container" style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="rubric-score-search-input"
              placeholder="Search evaluation"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
            />
            {searchTitle && (
              <button
                className="rubric-score-clear-search"
                onClick={() => setSearchTitle('')}
                type="button"
                aria-label="Clear search"
                title="Clear"
              >
                {React.createElement(CloseIcon)}
              </button>
            )}
          </div>

          <div className="profile2-yevaluation-stack">
            {filteredEvaluations.length === 0 ? (
              <div className="profile2-yevaluation-empty">
                <p>
                  {evaluations.length === 0
                    ? 'No evaluations available.'
                    : 'No matching evaluations found.'}
                </p>
              </div>
            ) : (
              <div className="student-requests-list">
                {filteredEvaluations.map((item) => (
                  <div
                    key={item.id}
                    className={`student-request-card ${item.status === 'completed' ? 'completed' : ''}`}
                    onClick={() => navigate(`/profile2/${item.id}`)}
                    style={{ position: 'relative' }}
                  >
                    <button
                      type="button"
                      title="Delete evaluation"
                      aria-label="Delete evaluation"
                      className="profile2-skill-delete-button"
                      style={{
                        left: '10px',
                        top: '10px',
                        zIndex: 2,
                        width: '28px',
                        height: '28px',
                        fontSize: '16px',
                        backgroundColor: '#e53935',
                        color: '#fff',
                        border: 'none',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvaluationItem(item.id);
                      }}
                    >
                      {React.createElement(DeleteIcon)}
                    </button>
                    <div className="student-request-header">
                      <div className="student-request-info">
                        <h3 className="student-name">{item.title}</h3>
                      </div>
                      <div className="student-request-status">
                        <span className={`status-badge ${item.status}`}>
                          {item.status === 'pending' ? 'Pending' : 'Completed'}
                        </span>
                      </div>
                    </div>
                    <div className="student-request-details">
                      <div className="request-detail-item">
                        <span className="detail-label">Rubric:</span>
                        <span
                          className={
                            item.detailsUnset
                              ? 'detail-value profile2-eval-detail-dashed'
                              : 'detail-value'
                          }
                        >
                          {item.detailsUnset ? '—' : item.rubricTitle || '—'}
                        </span>
                      </div>
                      <div className="request-detail-item">
                        <span className="detail-label">Portfolio:</span>
                        <span
                          className={
                            item.detailsUnset
                              ? 'detail-value profile2-eval-detail-dashed'
                              : 'detail-value'
                          }
                        >
                          {item.detailsUnset ? '—' : item.portfolioFileName || '—'}
                        </span>
                      </div>
                      <div className="request-detail-item">
                        <span className="detail-label">Requested:</span>
                        <span
                          className={
                            item.detailsUnset
                              ? 'detail-value profile2-eval-detail-dashed'
                              : 'detail-value'
                          }
                        >
                          {item.detailsUnset || !item.requestedAt
                            ? '—'
                            : formatDate(item.requestedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              className="rubric-score-add-box profile2-yevaluation-add-box"
              onClick={handleAddEvaluationItem}
              title="Add Evaluation"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAddEvaluationItem();
                }
              }}
            >
              <span className="rubric-score-add-box-spacer" />
              <button
                className="rubric-score-add-box-button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddEvaluationItem();
                }}
                title="Add Evaluation"
              >
                {React.createElement(PlusIcon)}
              </button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Profile2List;

