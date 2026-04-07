import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Profile.css';
import './RubricScore.css';
import { AiOutlineClose, AiOutlineDelete, AiOutlinePlus } from 'react-icons/ai';
import { getCurrentUserId } from '../utils/currentUser';
import api from '../api/index';
import {
  deleteSkillEvaluation,
  updateSkillEvaluation,
  getSkillEvaluationsByUser,
  type SkillEvaluationRecord,
} from '../services/skillEvaluationApi';
import {
  isEvaluationOwnedByCurrentSession,
  removeEvaluationOwner,
} from '../utils/evaluationOwnership';
import InstructionHelpBubble from './InstructionHelpBubble';
import { instructionStudentEvaluationOverview } from './instructionHelpContent';

const CloseIcon = AiOutlineClose as React.ComponentType;
const DeleteIcon = AiOutlineDelete as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;

interface StudentEvaluationItem {
  id: string;
  title: string;
  rubricTitle: string;
  portfolioFileName: string;
  requestedAt: string;
  status: 'drafted' | 'pending' | 'approved' | 'completed' | 'outdated' | 'expired';
}

interface RubricHistoryResponse {
  id: number;
  rubric_score_id: number;
  expired_at?: string | null;
  status?: string | null;
}

interface RubricResponse {
  id: number;
  name: string;
}

interface EvaluationDisplayMeta {
  rubricId: string;
  rubricTitle: string;
  portfolioFileName: string;
}

const evaluationMetaKey = (evaluationId: string) => `evaluation_display_meta_${evaluationId}`;

const readEvaluationMeta = (evaluationId: string): EvaluationDisplayMeta | null => {
  try {
    const raw = localStorage.getItem(evaluationMetaKey(evaluationId));
    if (!raw) return null;
    return JSON.parse(raw) as EvaluationDisplayMeta;
  } catch {
    return null;
  }
};

const Profile2List: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTitle, setSearchTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeletingIds, setIsDeletingIds] = useState<Set<string>>(new Set());
  const [evaluations, setEvaluations] = useState<StudentEvaluationItem[]>([]);
  const rubricTitleByHistoryIdRef = useRef<Map<number, string>>(new Map());
  const rubricExpiredByHistoryIdRef = useRef<Map<number, boolean>>(new Map());
  const rubricOutdatedByHistoryIdRef = useRef<Map<number, boolean>>(new Map());

  const mapBackendEvaluation = async (ev: SkillEvaluationRecord): Promise<StudentEvaluationItem> => {
    const id = String(ev.id);
    const meta = readEvaluationMeta(id);
    let rubricTitle = meta?.rubricTitle || `History #${ev.rubric_score_history_id}`;
    const isRubricHistoryExpired = rubricExpiredByHistoryIdRef.current.get(ev.rubric_score_history_id) || false;
    const isRubricHistoryOutdated =
      rubricOutdatedByHistoryIdRef.current.get(ev.rubric_score_history_id) || false;

    if (!meta?.rubricTitle && !rubricTitleByHistoryIdRef.current.has(ev.rubric_score_history_id)) {
      try {
        const rh = await api.get<RubricHistoryResponse>(`rubric_score_history/${ev.rubric_score_history_id}`);
        const rubric = await api.get<RubricResponse>(`rubric/${rh.data.rubric_score_id}`);
        rubricTitleByHistoryIdRef.current.set(
          ev.rubric_score_history_id,
          rubric.data.name || rubricTitle
        );
      } catch {
      }
    }
    rubricTitle =
      rubricTitleByHistoryIdRef.current.get(ev.rubric_score_history_id) || rubricTitle;

    const mappedStatus: StudentEvaluationItem['status'] =
      isRubricHistoryExpired
        ? 'expired'
        : isRubricHistoryOutdated
          ? 'outdated'
        : ev.status === 'approved'
          ? 'approved'
        : ev.status === 'completed'
          ? 'completed'
          : ev.status === 'pending'
            ? 'pending'
            : 'drafted';

    return {
      id,
      title: rubricTitle || `Evaluation #${ev.id}`,
      rubricTitle,
      portfolioFileName: meta?.portfolioFileName || `Portfolio #${ev.portfolio_id}`,
      requestedAt:
        mappedStatus === 'drafted' || mappedStatus === 'outdated' || mappedStatus === 'expired'
          ? ''
          : (ev.created_at || ''),
      status: mappedStatus,
    };
  };

  const loadEvaluations = useCallback(async () => {
    try {
      setIsLoading(true);
      const userId = getCurrentUserId();
      const rows = await getSkillEvaluationsByUser(userId);
      const scopedRows = rows.filter((row) => isEvaluationOwnedByCurrentSession(row.id));

      const idsNeedingRubric = Array.from(
        new Set(
          scopedRows
            .filter(
              (row) =>
                !rubricTitleByHistoryIdRef.current.has(row.rubric_score_history_id) ||
                !rubricExpiredByHistoryIdRef.current.has(row.rubric_score_history_id) ||
                !rubricOutdatedByHistoryIdRef.current.has(row.rubric_score_history_id)
            )
            .map((row) => row.rubric_score_history_id)
        )
      );
      await Promise.all(
        idsNeedingRubric.map(async (historyId) => {
          try {
            const rh = await api.get<RubricHistoryResponse>(`rubric_score_history/${historyId}`);
            const isExpired = rh.data.status === 'expired';
            rubricExpiredByHistoryIdRef.current.set(historyId, isExpired);
            rubricOutdatedByHistoryIdRef.current.set(historyId, rh.data.status === 'outdated');
            const rubric = await api.get<RubricResponse>(`rubric/${rh.data.rubric_score_id}`);
            rubricTitleByHistoryIdRef.current.set(
              historyId,
              rubric.data.name || `History #${historyId}`
            );
          } catch {
          }
        })
      );

      const enriched = await Promise.all(scopedRows.map((row) => mapBackendEvaluation(row)));
      const rowsToExpire = scopedRows.filter((row) => {
        const shouldExpire =
          rubricExpiredByHistoryIdRef.current.get(row.rubric_score_history_id) || false;
        return shouldExpire && row.status !== 'expired';
      });
      const rowsToOutdate = scopedRows.filter((row) => {
        const shouldOutdate =
          rubricOutdatedByHistoryIdRef.current.get(row.rubric_score_history_id) || false;
        if (row.status === 'expired' || row.status === 'completed' || row.status === 'approved') {
          return false;
        }
        return shouldOutdate && row.status !== 'outdated';
      });
      await Promise.all([
        ...rowsToExpire.map((row) =>
          updateSkillEvaluation(row.id, { status: 'expired' }).catch(() => {})
        ),
        ...rowsToOutdate.map((row) =>
          updateSkillEvaluation(row.id, { status: 'outdated' }).catch(() => {})
        ),
      ]);
      setEvaluations(enriched);
    } catch (error) {
      console.error('Error loading evaluations:', error);
      setEvaluations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvaluations();
  }, [loadEvaluations]);

  useEffect(() => {
    const state = (location.state || {}) as {
      addedSkillEvaluationId?: string;
      refreshAt?: number;
      removeEvaluationId?: string;
    };
    if (!state.addedSkillEvaluationId && !state.refreshAt && !state.removeEvaluationId) return;
    void loadEvaluations();
    navigate('/profile2', { replace: true, state: {} });
  }, [location.state, navigate, loadEvaluations]);

  const filteredEvaluations = useMemo(() => {
    const q = searchTitle.trim().toLowerCase();
    if (!q) return evaluations;
    return evaluations.filter((item) => item.title.toLowerCase().includes(q));
  }, [evaluations, searchTitle]);

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

  const handleAddEvaluationItem = () => {
    navigate('/profile2/new');
  };

  const handleDeleteEvaluationItem = async (id: string) => {
    if (isDeletingIds.has(id)) return;
    try {
      setIsDeletingIds((prev) => new Set(prev).add(id));
      const numericId = Number(id);
      if (Number.isInteger(numericId) && numericId > 0) {
        await deleteSkillEvaluation(numericId);
      }
      try {
        localStorage.removeItem(evaluationMetaKey(id));
        removeEvaluationOwner(id);
      } catch {
      }
      setEvaluations((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      alert('Failed to delete evaluation. Please try again.');
    } finally {
      setIsDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="rubric-score-wrapper">
      <div className="rubric-score-container">
        <div className="rubric-score-title-row">
          <h1 className="rubric-score-title">Your Evaluation</h1>
          <InstructionHelpBubble
            content={instructionStudentEvaluationOverview}
            ariaLabel="Evaluation page help"
          />
        </div>

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

          <div className="profile2-yevaluation-stack">
            {filteredEvaluations.length === 0 ? (
              <div className="profile2-yevaluation-empty">
                <p>
                  {isLoading
                    ? 'Loading evaluations...'
                    : evaluations.length === 0
                    ? 'No evaluations available.'
                    : 'No matching evaluations found.'}
                </p>
              </div>
            ) : (
              <div className="student-requests-list">
                {filteredEvaluations.map((item) => (
                  <div
                    key={item.id}
                    className={`student-request-card ${item.status === 'completed' || item.status === 'approved' ? 'completed' : ''} ${
                      item.status === 'expired' ? 'expired' : ''
                    }`}
                    onClick={() => {
                      if (item.status === 'expired') return;
                      navigate(`/profile2/${item.id}`);
                    }}
                    style={{
                      position: 'relative',
                      cursor: item.status === 'expired' ? 'not-allowed' : 'pointer',
                      opacity: item.status === 'expired' ? 0.6 : 1,
                    }}
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
                        void handleDeleteEvaluationItem(item.id);
                      }}
                    >
                      {React.createElement(DeleteIcon)}
                    </button>
                    <div className="student-request-header">
                      <div className="student-request-info">
                        <h3 className="student-name">{item.title}</h3>
                      </div>
                      <div className="student-request-status">
                        <span
                          className={`status-badge ${
                            item.status === 'expired'
                              ? 'expired'
                              : item.status === 'outdated'
                                ? 'outdated'
                              : item.status === 'approved'
                                ? 'completed'
                              : item.status === 'completed'
                                ? 'completed'
                                : 'pending'
                          }`}
                        >
                          {item.status === 'expired'
                            ? 'Expired'
                            : item.status === 'outdated'
                              ? 'Outdated'
                            : item.status === 'approved'
                              ? 'Approved'
                            : item.status === 'completed'
                              ? 'Completed'
                              : item.status === 'pending'
                                ? 'Pending'
                                : 'Drafted'}
                        </span>
                      </div>
                    </div>
                    <div className="student-request-details">
                      <div className="request-detail-item">
                        <span className="detail-label">Rubric:</span>
                        <span
                          className="detail-value"
                        >
                          {item.rubricTitle || '—'}
                        </span>
                      </div>
                      <div className="request-detail-item">
                        <span className="detail-label">Portfolio:</span>
                        <span
                          className="detail-value"
                        >
                          {item.portfolioFileName || '—'}
                        </span>
                      </div>
                      <div className="request-detail-item">
                        <span className="detail-label">Requested:</span>
                        <span
                          className="detail-value"
                        >
                          {!item.requestedAt
                            ? '—'
                            : formatDate(item.requestedAt)}
                        </span>
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

export default Profile2List;

