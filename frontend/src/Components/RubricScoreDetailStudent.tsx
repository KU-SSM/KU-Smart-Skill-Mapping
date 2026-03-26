import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineHistory } from 'react-icons/ai';
import { FiX } from 'react-icons/fi';
import RubricScoreTable from './RubricScoreTable';
import {
  getRubricScore,
  getRubricScoreHistoryByRubric,
  getRubricScoreHistorySnapshot,
} from '../services/rubricScoreApi';
import './RubricScore.css';

const BackIcon = AiOutlineArrowLeft as React.ComponentType;
const HistoryIcon = AiOutlineHistory as React.ComponentType;
const CancelIcon = FiX as React.ComponentType;

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

const RubricScoreDetailStudent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<TableData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFormerRubricsOpen, setIsFormerRubricsOpen] = useState<boolean>(false);
  const [selectedFormerVersion, setSelectedFormerVersion] = useState<FormerRubricVersion | null>(null);
  const [isViewingCurrentVersion, setIsViewingCurrentVersion] = useState<boolean>(false);
  const [savedFormerRubricVersions, setSavedFormerRubricVersions] = useState<FormerRubricVersion[]>([]);
  const [backendFormerRubricVersions, setBackendFormerRubricVersions] = useState<FormerRubricVersion[]>([]);

  const historyStorageKey = useMemo(() => {
    if (!id) return null;
    return `former_rubric_versions_${id}`;
  }, [id]);

  // Same storage key as teacher rubric detail — students only read (no edits / no expiration modal).
  useEffect(() => {
    if (!historyStorageKey) {
      setSavedFormerRubricVersions([]);
      return;
    }
    try {
      const raw = localStorage.getItem(historyStorageKey);
      if (!raw) {
        setSavedFormerRubricVersions([]);
        return;
      }
      const parsed = JSON.parse(raw) as FormerRubricVersion[];
      setSavedFormerRubricVersions(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedFormerRubricVersions([]);
    }
  }, [historyStorageKey]);

  useEffect(() => {
    const loadRubricScore = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const rubricData = await getRubricScore(id);
        setTitle(rubricData.title);
        setHeaders(rubricData.headers);
        setRows(rubricData.rows);
      } catch (error: any) {
        console.error('Error loading rubric score:', error);
        setTitle('Rubric Score Not Found');
        setHeaders([]);
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRubricScore();
  }, [id]);

  const loadBackendFormerSnapshots = useCallback(async () => {
    if (!id || !title) return;
    try {
      const histories = await getRubricScoreHistoryByRubric(id);
      const former = histories
        .filter((h) => !(h.status === 'valid' && h.expired_at === null))
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

      if (former.length === 0) {
        setBackendFormerRubricVersions([]);
        return;
      }

      const converted: FormerRubricVersion[] = [];
      for (const h of former) {
        const snapshot = await getRubricScoreHistorySnapshot(h.id);
        const isEmptySnapshot =
          snapshot.headers.length === 0 && snapshot.rows.length === 0;
        if (isEmptySnapshot) {
          continue;
        }
        converted.push({
          version: `h${h.id}`,
          createdAt: h.created_at,
          expiresAt: h.expired_at ?? '',
          title,
          headers: snapshot.headers,
          rows: snapshot.rows,
        });
      }
      setBackendFormerRubricVersions(converted);
    } catch (e) {
      console.warn('Failed to load backend rubric history; using localStorage fallback.', e);
      setBackendFormerRubricVersions([]);
    }
  }, [id, title]);

  // Load former snapshots from backend (backend source of truth; localStorage only as fallback).
  useEffect(() => {
    void loadBackendFormerSnapshots();
  }, [loadBackendFormerSnapshots]);

  // Prefer the richer source when backend/local snapshot counts diverge.
  const formerRubricVersionsRaw =
    backendFormerRubricVersions.length >= savedFormerRubricVersions.length
      ? backendFormerRubricVersions
      : savedFormerRubricVersions;
  const formerRubricVersions = formerRubricVersionsRaw.filter((v) => {
    if (v.headers.length > 0) return true;
    return v.rows.some(
      (r) => (r.skillArea || '').trim() !== '' || r.values.some((c) => (c || '').trim() !== '')
    );
  });

  // Keep backend snapshot titles synced with whatever the user renamed the rubric to.
  useEffect(() => {
    if (!title) return;
    setBackendFormerRubricVersions((prev) => prev.map((v) => ({ ...v, title })));
  }, [title]);

  const handleBack = () => {
    navigate('/rubric_score_student');
  };

  const handleOpenFormerRubrics = () => {
    void (async () => {
      await loadBackendFormerSnapshots();
      setIsFormerRubricsOpen(true);
      setSelectedFormerVersion(null);
      setIsViewingCurrentVersion(false);
    })();
  };

  const handleCloseFormerRubrics = () => {
    setIsFormerRubricsOpen(false);
    setSelectedFormerVersion(null);
    setIsViewingCurrentVersion(false);
  };

  const handleOpenFormerVersion = (item: FormerRubricVersion) => {
    setSelectedFormerVersion(item);
    setIsViewingCurrentVersion(false);
  };

  const handleOpenCurrentVersion = () => {
    setSelectedFormerVersion(null);
    setIsViewingCurrentVersion(true);
  };

  if (isLoading) {
    return (
      <div className="rubric-score-wrapper">
        <div className="rubric-score-container">
          <h1 className="rubric-score-title">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="rubric-score-wrapper">
      <div className="rubric-score-container">
        <div className="rubric-score-title-container">
          <h1 className="rubric-score-title">{title}</h1>
          <button
            className="rubric-history-button"
            onClick={handleOpenFormerRubrics}
            title="View former rubric versions (expiring)"
            type="button"
          >
            {React.createElement(HistoryIcon)}
          </button>
        </div>
        <RubricScoreTable
          headers={headers}
          rows={rows}
          onHeadersChange={setHeaders}
          onRowsChange={setRows}
          readOnly={true}
        />
        <div className="save-button-container">
          <button className="back-button" onClick={handleBack}>
            {React.createElement(BackIcon)}
            <span>Back</span>
          </button>
        </div>
      </div>

      {isFormerRubricsOpen && (
        <div className="rubric-modal-overlay" onClick={handleCloseFormerRubrics}>
          <div className="rubric-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rubric-modal-header">
              <h2 className="rubric-modal-title">
                {isViewingCurrentVersion
                  ? 'Current rubric detail'
                  : selectedFormerVersion
                    ? 'Former rubric detail'
                    : 'Rubric versions'}
              </h2>
              <button
                type="button"
                className="rubric-modal-close"
                onClick={handleCloseFormerRubrics}
                aria-label="Close"
                title="Close"
              >
                {React.createElement(CancelIcon)}
              </button>
            </div>

            {isViewingCurrentVersion ? (
              <>
                <div className="rubric-history-detail-meta">
                  <div>Title: {title || 'Untitled Rubric'}</div>
                  <div>Status: Current version</div>
                </div>
                <div className="rubric-history-detail-body">
                  <RubricScoreTable
                    headers={headers}
                    rows={rows}
                    onHeadersChange={() => {}}
                    onRowsChange={() => {}}
                    readOnly={true}
                  />
                </div>
                <div className="rubric-modal-actions">
                  <button
                    type="button"
                    className="rubric-modal-button secondary"
                    onClick={() => setIsViewingCurrentVersion(false)}
                  >
                    Back to versions
                  </button>
                  <button
                    type="button"
                    className="rubric-modal-button"
                    onClick={handleCloseFormerRubrics}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : selectedFormerVersion ? (
              <>
                <div className="rubric-history-detail-meta">
                  <div>Title: {selectedFormerVersion.title || selectedFormerVersion.version}</div>
                  <div>Created: {selectedFormerVersion.createdAt}</div>
                  <div>Expires: {selectedFormerVersion.expiresAt}</div>
                </div>
                <div className="rubric-history-detail-body">
                  <RubricScoreTable
                    headers={selectedFormerVersion.headers}
                    rows={selectedFormerVersion.rows}
                    onHeadersChange={() => {}}
                    onRowsChange={() => {}}
                    readOnly={true}
                  />
                </div>
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
                    onClick={handleCloseFormerRubrics}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rubric-history-list">
                  <button
                    type="button"
                    className="rubric-history-item rubric-history-item-button"
                    onClick={handleOpenCurrentVersion}
                  >
                    <div className="rubric-history-left">
                      <div className="rubric-history-version">Current</div>
                      <div className="rubric-history-meta">{title || 'Untitled Rubric'}</div>
                    </div>
                    <div className="rubric-history-right">
                      <div className="rubric-history-exp">Now</div>
                    </div>
                  </button>

                  {formerRubricVersions.map((item) => (
                    <button
                      key={item.version}
                      type="button"
                      className="rubric-history-item rubric-history-item-button"
                      onClick={() => handleOpenFormerVersion(item)}
                    >
                      <div className="rubric-history-left">
                        <div className="rubric-history-version">{item.title || item.version}</div>
                        <div className="rubric-history-meta">
                          Created: {item.createdAt} · {item.version}
                        </div>
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
                    onClick={handleCloseFormerRubrics}
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

export default RubricScoreDetailStudent;
