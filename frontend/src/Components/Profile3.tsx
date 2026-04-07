import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import './RubricScore.css';
import { AiOutlineClose } from 'react-icons/ai';
import api from '../api/index';
import { getSkillEvaluations, type SkillEvaluationRecord } from '../services/skillEvaluationApi';
import { getEvaluationOwner } from '../utils/evaluationOwnership';

const CloseIcon = AiOutlineClose as React.ComponentType;

interface StudentRequest {
  id: string;
  studentName: string;
  portfolioFileName: string;
  rubricTitle: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'completed';
}

interface RubricHistoryResponse {
  id: number;
  rubric_score_id: number;
}

interface RubricResponse {
  id: number;
  name: string;
}

interface PortfolioResponse {
  id: number;
  filename?: string;
}

type TeacherRequestFilter = 'all' | 'pending' | 'approved' | 'completed';

const Profile3: React.FC = () => {
  const navigate = useNavigate();
  const [searchStudentName, setSearchStudentName] = useState<string>('');
  const [studentRequests, setStudentRequests] = useState<StudentRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<TeacherRequestFilter>('all');
  const studentNameByUserIdRef = useRef<Map<number, string>>(new Map());
  const rubricTitleByHistoryIdRef = useRef<Map<number, string>>(new Map());
  const portfolioNameByIdRef = useRef<Map<number, string>>(new Map());

  const mapBackendRequest = useCallback(async (ev: SkillEvaluationRecord): Promise<StudentRequest | null> => {
    const mappedStatus: StudentRequest['status'] | null =
      ev.status === 'pending'
        ? 'pending'
        : ev.status === 'approved'
          ? 'approved'
        : ev.status === 'completed'
          ? 'completed'
          : null;

    if (!mappedStatus) {
      return null;
    }

    let studentName =
      studentNameByUserIdRef.current.get(ev.user_id) || `Student #${ev.user_id}`;
    const ownerUsername = getEvaluationOwner(ev.id);
    if (ownerUsername) {
      studentName = ownerUsername;
    }
    let rubricTitle =
      rubricTitleByHistoryIdRef.current.get(ev.rubric_score_history_id) ||
      `History #${ev.rubric_score_history_id}`;
    const portfolioFileName =
      portfolioNameByIdRef.current.get(ev.portfolio_id) || `Portfolio #${ev.portfolio_id}`;

    if (!studentNameByUserIdRef.current.has(ev.user_id)) {
      try {
        const userRes = await api.get<{ id: number; name?: string }>(`user/${ev.user_id}`);
        const resolvedName = userRes.data.name || studentName;
        studentNameByUserIdRef.current.set(ev.user_id, resolvedName);
        studentName = resolvedName;
      } catch {
      }
    }

    if (!rubricTitleByHistoryIdRef.current.has(ev.rubric_score_history_id)) {
      try {
        const rh = await api.get<RubricHistoryResponse>(`rubric_score_history/${ev.rubric_score_history_id}`);
        const rubricRes = await api.get<RubricResponse>(`rubric/${rh.data.rubric_score_id}`);
        const resolvedTitle = rubricRes.data.name || rubricTitle;
        rubricTitleByHistoryIdRef.current.set(ev.rubric_score_history_id, resolvedTitle);
        rubricTitle = resolvedTitle;
      } catch {
      }
    }

    return {
      id: String(ev.id),
      studentName,
      portfolioFileName,
      rubricTitle,
      requestedAt: ev.created_at || '',
      status: mappedStatus,
    };
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const rows = await getSkillEvaluations();

      const relevantRows = rows.filter(
        (row) => row.status === 'pending' || row.status === 'completed' || row.status === 'approved'
      );
      const userIdsToFetch = Array.from(
        new Set(
          relevantRows
            .map((row) => row.user_id)
            .filter((id) => !studentNameByUserIdRef.current.has(id))
        )
      );
      const historyIdsToFetch = Array.from(
        new Set(
          relevantRows
            .map((row) => row.rubric_score_history_id)
            .filter((id) => !rubricTitleByHistoryIdRef.current.has(id))
        )
      );
      const portfolioIdsToFetch = Array.from(
        new Set(
          relevantRows
            .map((row) => row.portfolio_id)
            .filter((id) => !portfolioNameByIdRef.current.has(id))
        )
      );

      await Promise.all([
        Promise.all(
          userIdsToFetch.map(async (userId) => {
            try {
              const userRes = await api.get<{ id: number; name?: string }>(`user/${userId}`);
              studentNameByUserIdRef.current.set(
                userId,
                userRes.data.name || `Student #${userId}`
              );
            } catch {
            }
          })
        ),
        Promise.all(
          historyIdsToFetch.map(async (historyId) => {
            try {
              const rh = await api.get<RubricHistoryResponse>(`rubric_score_history/${historyId}`);
              const rubricRes = await api.get<RubricResponse>(`rubric/${rh.data.rubric_score_id}`);
              rubricTitleByHistoryIdRef.current.set(
                historyId,
                rubricRes.data.name || `History #${historyId}`
              );
            } catch {
            }
          })
        ),
        Promise.all(
          portfolioIdsToFetch.map(async (portfolioId) => {
            try {
              const portfolioRes = await api.get<PortfolioResponse>(`portfolio/${portfolioId}`);
              const filename = (portfolioRes.data.filename || '').trim() || `Portfolio #${portfolioId}`;
              portfolioNameByIdRef.current.set(portfolioId, filename);
            } catch {
            }
          })
        ),
      ]);

      const mapped = await Promise.all(relevantRows.map((row) => mapBackendRequest(row)));
      setStudentRequests(
        mapped
          .filter((item): item is StudentRequest => item !== null)
          .sort((a, b) => {
            if (a.status !== b.status) {
              return a.status === 'pending' ? -1 : 1;
            }
            return Number(b.id) - Number(a.id);
          })
      );
    } catch (error) {
      console.error('Error loading student evaluation requests:', error);
      setStudentRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [mapBackendRequest]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleCardClick = (requestId: string) => {
    navigate(`/profile3/${requestId}`);
  };

  const formatDate = (dateString: string) => {
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateString);
    const normalizedIso = hasTimezone ? dateString : `${dateString}Z`;
    const date = new Date(normalizedIso);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Bangkok',
      hour12: false,
    });
  };

  const filteredRequests = useMemo(() => {
    const q = searchStudentName.trim().toLowerCase();
    return studentRequests.filter((req) => {
      const matchesSearch = !q || req.studentName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [studentRequests, searchStudentName, statusFilter]);

  return (
    <div className="rubric-score-wrapper">
      <div className="rubric-score-container">
        <h1 className="rubric-score-title">Student Evaluation Requests</h1>

          <div className="profile3-filter-group">
            <button
              type="button"
              className={`profile3-filter-button ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`profile3-filter-button ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              type="button"
              className={`profile3-filter-button ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              Approved
            </button>
            <button
              type="button"
              className={`profile3-filter-button ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </button>
          </div>

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
                {isLoading
                  ? 'Loading student evaluation requests...'
                  : studentRequests.length === 0
                  ? 'No student evaluation requests available.'
                  : 'No matching requests found.'}
              </p>
            </div>
          ) : (
            <div className="student-requests-list">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className={`student-request-card ${
                    request.status === 'completed' || request.status === 'approved' ? 'completed' : ''
                  }`}
                  onClick={() => handleCardClick(request.id)}
                >
                  <div className="student-request-header">
                    <div className="student-request-info">
                      <h3 className="student-name">{request.studentName}</h3>
                    </div>
                    <div className="student-request-status">
                      <span
                        className={`status-badge ${
                          request.status === 'approved' ? 'completed' : request.status
                        }`}
                      >
                        {request.status === 'pending'
                          ? 'Pending'
                          : request.status === 'approved'
                            ? 'Approved'
                            : 'Completed'}
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
  );
};

export default Profile3;
