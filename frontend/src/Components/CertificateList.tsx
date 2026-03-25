import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import './RubricScore.css';
import { getCurrentUserId } from '../utils/currentUser';
import api from '../api/index';
import { getSkillEvaluationsByUser, type SkillEvaluationRecord } from '../services/skillEvaluationApi';

interface CertificateEvaluationItem {
  id: string;
  title: string;
  rubricTitle: string;
  requestedAt: string;
  status: 'completed';
}

interface RubricHistoryResponse {
  id: number;
  rubric_score_id: number;
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

const CertificateList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTitle, setSearchTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [evaluations, setEvaluations] = useState<CertificateEvaluationItem[]>([]);
  const rubricTitleByHistoryIdRef = useRef<Map<number, string>>(new Map());

  const mapBackendEvaluation = async (ev: SkillEvaluationRecord): Promise<CertificateEvaluationItem> => {
    const id = String(ev.id);
    const meta = readEvaluationMeta(id);
    let rubricTitle = meta?.rubricTitle || `History #${ev.rubric_score_history_id}`;

    if (!meta?.rubricTitle && !rubricTitleByHistoryIdRef.current.has(ev.rubric_score_history_id)) {
      try {
        const rh = await api.get<RubricHistoryResponse>(`rubric_score_history/${ev.rubric_score_history_id}`);
        const rubric = await api.get<RubricResponse>(`rubric/${rh.data.rubric_score_id}`);
        rubricTitleByHistoryIdRef.current.set(
          ev.rubric_score_history_id,
          rubric.data.name || rubricTitle
        );
      } catch {
        // keep fallback title
      }
    }

    rubricTitle = rubricTitleByHistoryIdRef.current.get(ev.rubric_score_history_id) || rubricTitle;

    return {
      id,
      title: rubricTitle || `Evaluation #${ev.id}`,
      rubricTitle,
      requestedAt: ev.created_at || '',
      status: 'completed',
    };
  };

  const loadEvaluations = useCallback(async () => {
    try {
      setIsLoading(true);
      const userId = getCurrentUserId();
      const rows = await getSkillEvaluationsByUser(userId);
      const completedRows = rows.filter((row) => row.status === 'completed' || row.status === 'approved');

      const idsNeedingRubric = Array.from(
        new Set(
          completedRows
            .filter((row) => !rubricTitleByHistoryIdRef.current.has(row.rubric_score_history_id))
            .map((row) => row.rubric_score_history_id)
        )
      );

      await Promise.all(
        idsNeedingRubric.map(async (historyId) => {
          try {
            const rh = await api.get<RubricHistoryResponse>(`rubric_score_history/${historyId}`);
            const rubric = await api.get<RubricResponse>(`rubric/${rh.data.rubric_score_id}`);
            rubricTitleByHistoryIdRef.current.set(historyId, rubric.data.name || `History #${historyId}`);
          } catch {
            // keep fallback title
          }
        })
      );

      const enriched = await Promise.all(completedRows.map((row) => mapBackendEvaluation(row)));
      setEvaluations(enriched);
    } catch (error) {
      console.error('Error loading certificate evaluations:', error);
      setEvaluations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvaluations();
  }, [loadEvaluations]);

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

  return (
    <div className="rubric-score-wrapper">
      <div className="rubric-score-container">
        <h1 className="rubric-score-title">Select Completed Evaluation</h1>

        <div className="rubric-score-search-container" style={{ marginBottom: '16px' }}>
          <input
            type="text"
            className="rubric-score-search-input"
            placeholder="Search evaluation"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
          />
        </div>

        <div className="profile2-yevaluation-stack">
          {filteredEvaluations.length === 0 ? (
            <div className="profile2-yevaluation-empty">
              <p>
                {isLoading
                  ? 'Loading completed evaluations...'
                  : evaluations.length === 0
                    ? 'No completed evaluations available.'
                    : 'No matching evaluations found.'}
              </p>
            </div>
          ) : (
            <div className="student-requests-list">
              {filteredEvaluations.map((item) => (
                <div
                  key={item.id}
                  className="student-request-card completed"
                  onClick={() => navigate(`/certificate/${item.id}`)}
                  style={{ position: 'relative' }}
                >
                  <div className="student-request-header">
                    <div className="student-request-info">
                      <h3 className="student-name">{item.title}</h3>
                    </div>
                    <div className="student-request-status">
                      <span className="status-badge completed">Completed</span>
                    </div>
                  </div>
                  <div className="student-request-details">
                    <div className="request-detail-item">
                      <span className="detail-label">Rubric:</span>
                      <span className="detail-value">{item.rubricTitle || '—'}</span>
                    </div>
                    <div className="request-detail-item">
                      <span className="detail-label">Requested:</span>
                      <span className="detail-value">{!item.requestedAt ? '—' : formatDate(item.requestedAt)}</span>
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

export default CertificateList;
