import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineDelete, AiOutlineArrowLeft, AiOutlineHistory } from 'react-icons/ai';
import { FiSave, FiX } from 'react-icons/fi';
import RubricScoreTable from './RubricScoreTable';
import {
  getRubricScore,
  updateRubricScore,
  deleteRubricScore,
  getRubricScoreHistoryByRubric,
  getRubricScoreHistorySnapshot,
  updateRubricScoreHistoryExpiration,
} from '../services/rubricScoreApi';
import { localDateAndTimeToUtcIso } from '../utils/dateTime';
import { getApiErrorDetail } from '../utils/apiErrors';
import InstructionHelpBubble from './InstructionHelpBubble';
import {
  instructionTeacherRubricSaveExpiration,
  instructionTeacherRubricTable,
} from './instructionHelpContent';
import './RubricScore.css';

const DeleteIcon = AiOutlineDelete as React.ComponentType;
const BackIcon = AiOutlineArrowLeft as React.ComponentType;
const HistoryIcon = AiOutlineHistory as React.ComponentType;
const SaveIcon = FiSave as React.ComponentType;
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

interface CurrentPopupSnapshot {
  title: string;
  headers: string[];
  rows: TableData[];
}

const RubricScoreDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<TableData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const [originalTitle, setOriginalTitle] = useState<string>('');
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [originalRows, setOriginalRows] = useState<TableData[]>([]);

  const [expirationDate, setExpirationDate] = useState<string>('');
  const [expirationTime, setExpirationTime] = useState<string>('23:59:59');
  const [isFormerRubricsOpen, setIsFormerRubricsOpen] = useState<boolean>(false);
  const [selectedFormerVersion, setSelectedFormerVersion] = useState<FormerRubricVersion | null>(null);
  const [isViewingCurrentVersion, setIsViewingCurrentVersion] = useState<boolean>(false);
  const [savedFormerRubricVersions, setSavedFormerRubricVersions] = useState<FormerRubricVersion[]>([]);
  const [backendFormerRubricVersions, setBackendFormerRubricVersions] = useState<FormerRubricVersion[]>([]);
  const [currentPopupSnapshot, setCurrentPopupSnapshot] = useState<CurrentPopupSnapshot>({
    title: '',
    headers: [],
    rows: [],
  });
  const [showFormerExpirationModal, setShowFormerExpirationModal] = useState<boolean>(false);
  const [showSaveExpirationModal, setShowSaveExpirationModal] = useState<boolean>(false);
  const [pendingSaveTitle, setPendingSaveTitle] = useState<string>('');
  const [hasHydratedFormerVersions, setHasHydratedFormerVersions] = useState<boolean>(false);
  const [historyRefreshNonce, setHistoryRefreshNonce] = useState(0);

  const getDefaultExpirationDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };

  const historyStorageKey = useMemo(() => {
    if (!id) return null;
    return `former_rubric_versions_${id}`;
  }, [id]);

  useEffect(() => {
    setHasHydratedFormerVersions(false);
    if (!historyStorageKey) {
      setSavedFormerRubricVersions([]);
      return;
    }
    try {
      const raw = localStorage.getItem(historyStorageKey);
      if (!raw) {
        setSavedFormerRubricVersions([]);
        setHasHydratedFormerVersions(true);
        return;
      }
      const parsed = JSON.parse(raw) as FormerRubricVersion[];
      setSavedFormerRubricVersions(Array.isArray(parsed) ? parsed : []);
      setHasHydratedFormerVersions(true);
    } catch {
      setSavedFormerRubricVersions([]);
      setHasHydratedFormerVersions(true);
    }
  }, [historyStorageKey]);

  useEffect(() => {
    if (!historyStorageKey) return;
    if (!hasHydratedFormerVersions) return;
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(savedFormerRubricVersions));
    } catch {
    }
  }, [historyStorageKey, savedFormerRubricVersions, hasHydratedFormerVersions]);

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

  const currentHistoryTitle = currentPopupSnapshot.title || 'Untitled Rubric';
  const currentHistoryHeaders = currentPopupSnapshot.headers;
  const currentHistoryRows = currentPopupSnapshot.rows;

  useEffect(() => {
    if (!title) return;
    setBackendFormerRubricVersions((prev) => prev.map((v) => ({ ...v, title })));
  }, [title]);

  useEffect(() => {
    if (!title) return;
    setSavedFormerRubricVersions((prev) => prev.map((v) => ({ ...v, title })));
  }, [title]);

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
        
        setOriginalTitle(rubricData.title);
        setOriginalHeaders(rubricData.headers.map(h => h)); // Deep copy
        setOriginalRows(rubricData.rows.map(row => ({
          skillArea: row.skillArea,
          values: row.values.map(v => v) // Deep copy of values array
        })));
      } catch (error: unknown) {
        console.error('Error loading rubric score:', error);
        alert(`Error: ${getApiErrorDetail(error) || 'Failed to load rubric score'}`);
        setTitle('Rubric Score Not Found');
        setHeaders([]);
        setRows([]);
        setOriginalTitle('Rubric Score Not Found');
        setOriginalHeaders([]);
        setOriginalRows([]);
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

  useEffect(() => {
    void loadBackendFormerSnapshots();
  }, [loadBackendFormerSnapshots, historyRefreshNonce]);

  const performSave = async (
    saveExpirationDate?: string,
    saveExpirationTime?: string,
    titleOverride?: string
  ) => {
    if (!id) {
      console.error('Cannot save: No rubric ID');
      return;
    }

    setIsSaving(true);

    try {
      const effectiveTitle = (titleOverride ?? title).trim();

      const rubricData = await updateRubricScore(id, {
        title: effectiveTitle,
        headers,
        rows,
      });

      if (saveExpirationDate || saveExpirationTime) {
        try {
          const histories = await getRubricScoreHistoryByRubric(id);
          const latestOutdated = [...histories]
            .filter((h) => h.status === 'outdated' && Number.isInteger(h.id) && h.id > 0)
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
          if (latestOutdated) {
            const targetDate = saveExpirationDate || expirationDate || getDefaultExpirationDate();
            const targetTime = saveExpirationTime || expirationTime || '23:59:59';
            const expiredAtIso = localDateAndTimeToUtcIso(targetDate, targetTime);
            await updateRubricScoreHistoryExpiration(latestOutdated.id, expiredAtIso);
          }
        } catch (e) {
          console.warn('Failed to persist expiration datetime to outdated history row.', e);
        }
      }


      const effectiveExpirationDate = saveExpirationDate ?? expirationDate ?? getDefaultExpirationDate();
      const effectiveExpirationTime = saveExpirationTime ?? expirationTime ?? '23:59:59';
      const expiresAt = `${effectiveExpirationDate} ${effectiveExpirationTime}`.trim();
      if (historyStorageKey) {
        const snapshotBase = {
          title: originalTitle || title || 'Untitled Rubric',
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          expiresAt,
          headers: originalHeaders.map((h) => h),
          rows: originalRows.map((r) => ({
            skillArea: r.skillArea,
            values: r.values.map((v) => v),
          })),
        };

        setSavedFormerRubricVersions((prev) => {
          const nextVersion = `v${prev.length + 1}`;
          const nextSnapshot: FormerRubricVersion = {
            version: nextVersion,
            ...snapshotBase,
          };
          const next = [...prev, nextSnapshot];
          try {
            localStorage.setItem(historyStorageKey, JSON.stringify(next));
          } catch {
          }
          return next;
        });
      }

      setTitle(rubricData.title);
      setHeaders(rubricData.headers);
      setRows(rubricData.rows);
      setOriginalTitle(rubricData.title);
      setOriginalHeaders(rubricData.headers.map(h => h));
      setOriginalRows(rubricData.rows.map(row => ({
        skillArea: row.skillArea,
        values: row.values.map(v => v)
      })));

      setHistoryRefreshNonce((n) => n + 1);

    } catch (error: unknown) {
      console.error('Error saving rubric score:', error);
      alert(
        `Error: ${getApiErrorDetail(error) || 'Failed to save rubric score. Please check the console for details.'}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChanges = () => {
    void (async () => {
      if (!id) return;
    const effectiveTitle = isEditingTitle ? editingTitle.trim() : title.trim();
    if (isEditingTitle) {
      setTitle(effectiveTitle || title);
      setIsEditingTitle(false);
    }
    const defaultExpirationDate = getDefaultExpirationDate();
    const defaultExpirationTime = '23:59:59';
    setExpirationDate(defaultExpirationDate);
    setExpirationTime(defaultExpirationTime);
      let isFirstSave = false;
      try {
        const histories = await getRubricScoreHistoryByRubric(id);
        isFirstSave = (histories || []).length === 0;
      } catch {
        isFirstSave = false;
      }

      if (isFirstSave) {
        performSave(defaultExpirationDate, defaultExpirationTime, effectiveTitle || title);
        return;
      }

      setPendingSaveTitle(effectiveTitle || title);
      setShowSaveExpirationModal(true);
    })();
  };

  const handleConfirmSaveWithExpiration = () => {
    const saveDate = expirationDate || getDefaultExpirationDate();
    const saveTime = expirationTime || '23:59:59';
    setShowSaveExpirationModal(false);
    performSave(saveDate, saveTime, pendingSaveTitle || title);
  };

  const handleOpenFormerRubrics = () => {
    void (async () => {
      await loadBackendFormerSnapshots();
      const snapshot: CurrentPopupSnapshot = {
        title: originalTitle || 'Untitled Rubric',
        headers: originalHeaders.map((h) => h),
        rows: originalRows.map((r) => ({
          skillArea: r.skillArea,
          values: r.values.map((v) => v),
        })),
      };
      setCurrentPopupSnapshot(snapshot);
      setIsFormerRubricsOpen(true);
      setSelectedFormerVersion(null);
      setIsViewingCurrentVersion(false);
    })();
  };

  const handleCloseFormerRubrics = () => {
    setIsFormerRubricsOpen(false);
    setSelectedFormerVersion(null);
    setIsViewingCurrentVersion(false);
    setShowFormerExpirationModal(false);
  };

  const handleOpenFormerVersion = (item: FormerRubricVersion) => {
    setSelectedFormerVersion(item);
    setIsViewingCurrentVersion(false);
  };

  const handleOpenCurrentVersion = () => {
    setSelectedFormerVersion(null);
    setIsViewingCurrentVersion(true);
  };

  const handleOpenFormerExpirationModal = () => {
    if (!selectedFormerVersion) return;
    const parts = (selectedFormerVersion.expiresAt || '').split(' ');
    if (parts.length >= 2) {
      setExpirationDate(parts[0] || '');
      setExpirationTime(parts[1].slice(0, 8) || '23:59:59');
    } else {
      setExpirationDate(getDefaultExpirationDate());
      setExpirationTime('23:59:59');
    }
    setShowFormerExpirationModal(true);
  };

  const handleConfirmFormerExpirationAndSave = () => {
    if (!selectedFormerVersion) return;
    const nextExpiresAt = `${expirationDate} ${expirationTime}`.trim();
    if (!nextExpiresAt) return;

    setSavedFormerRubricVersions((prev) => {
      const updated = prev.map((v) =>
        v.version === selectedFormerVersion.version ? { ...v, expiresAt: nextExpiresAt } : v
      );
      return updated;
    });

    setSelectedFormerVersion((prev) => (prev ? { ...prev, expiresAt: nextExpiresAt } : prev));
    setShowFormerExpirationModal(false);
  };

  const handleBack = () => {
    navigate('/rubric_score');
  };

  const handleCancel = () => {
    setTitle(originalTitle);
    setEditingTitle(originalTitle);
    setHeaders(originalHeaders.map(h => h)); // Create new array with deep copy
    setRows(originalRows.map(row => ({
      skillArea: row.skillArea,
      values: row.values.map(v => v) // Create new array for values with deep copy
    })));
    
    setIsEditingTitle(false);
  };

  const handleDelete = async () => {
    if (!id) {
      console.error('Cannot delete: No rubric ID');
      return;
    }

    setIsDeleting(true);

    try {
      await deleteRubricScore(id);
      
      navigate('/rubric_score');
    } catch (error) {
      console.error('Error deleting rubric score:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTitleClick = () => {
    setIsEditingTitle(true);
    setEditingTitle(title);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (editingTitle.trim()) {
      setTitle(editingTitle.trim());
    } else {
      setEditingTitle(title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingTitle(title);
      setIsEditingTitle(false);
    }
  };

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const hasUnsavedChanges = useMemo(() => {
    const titleChanged = isEditingTitle 
      ? editingTitle.trim() !== originalTitle
      : title !== originalTitle;
    
    const headersChanged = headers.length !== originalHeaders.length ||
      headers.some((h, i) => h !== (originalHeaders[i] || ''));
    
    const rowsChanged = rows.length !== originalRows.length ||
      rows.some((row, i) => {
        const originalRow = originalRows[i];
        if (!originalRow) return true;
        if (row.skillArea !== originalRow.skillArea) return true;
        if (row.values.length !== originalRow.values.length) return true;
        return row.values.some((val, j) => val !== (originalRow.values[j] || ''));
      });
    
    return titleChanged || headersChanged || rowsChanged;
  }, [title, editingTitle, isEditingTitle, headers, rows, originalTitle, originalHeaders, originalRows]);

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
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              className="rubric-score-title-input"
              value={editingTitle}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <h1 
              className="rubric-score-title"
              onClick={handleTitleClick}
              style={{ cursor: 'pointer' }}
            >
              {title}
            </h1>
          )}
          <button
            className="rubric-history-button"
            onClick={handleOpenFormerRubrics}
            title="View former rubric versions (expiring)"
            type="button"
          >
            {React.createElement(HistoryIcon)}
          </button>
          <InstructionHelpBubble
            content={instructionTeacherRubricTable}
            ariaLabel="Teacher rubric table help"
            triggerClassName="ihb-trigger--section"
          />
          <button 
            className="delete-rubric-button" 
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete Rubric Score"
          >
            {React.createElement(DeleteIcon)}
          </button>
        </div>
        <RubricScoreTable
          headers={headers}
          rows={rows}
          onHeadersChange={setHeaders}
          onRowsChange={setRows}
          onSave={handleSaveChanges}
        />
        <div className="save-button-container">
          <button className="back-button" onClick={handleBack}>
            {React.createElement(BackIcon)}
            <span>Back</span>
          </button>
          <div className="save-cancel-buttons-group">
            <button 
              className="cancel-changes-button" 
              onClick={handleCancel}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {React.createElement(CancelIcon)}
              <span>Cancel</span>
            </button>
            <button 
              className="save-changes-button" 
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {React.createElement(SaveIcon)}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
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
                  <div>Title: {currentHistoryTitle}</div>
                  <div>Status: Current version</div>
                </div>
                <div className="rubric-history-detail-body">
                  <RubricScoreTable
                    headers={currentHistoryHeaders}
                    rows={currentHistoryRows}
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
                    className="rubric-modal-button secondary"
                    onClick={handleOpenFormerExpirationModal}
                  >
                    Edit expiration date
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
                      <div className="rubric-history-meta">{currentHistoryTitle}</div>
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

      
      {showFormerExpirationModal && selectedFormerVersion && (
        <div className="modal-overlay rubric-expiration-overlay" onClick={() => setShowFormerExpirationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit expiration date</h2>
            <div className="modal-form">
              <div className="modal-field">
                <label className="modal-label" htmlFor="former-expiration-date">
                  Date
                </label>
                <input
                  id="former-expiration-date"
                  type="date"
                  className="modal-input"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>
              <div className="modal-field">
                <label className="modal-label" htmlFor="former-expiration-time">
                  Time
                </label>
                <input
                  id="former-expiration-time"
                  type="time"
                  step="1"
                  className="modal-input"
                  value={expirationTime}
                  onChange={(e) => setExpirationTime(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-buttons">
              <button
                type="button"
                className="modal-button modal-button-cancel"
                onClick={() => setShowFormerExpirationModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-button modal-button-apply"
                onClick={handleConfirmFormerExpirationAndSave}
              >
                Set and Save
              </button>
            </div>
          </div>
        </div>
      )}

      
      {showSaveExpirationModal && (
        <div className="modal-overlay rubric-expiration-overlay" onClick={() => setShowSaveExpirationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title rubric-save-expiration-modal-title">
              Set expiration date before saving
              <InstructionHelpBubble
                content={instructionTeacherRubricSaveExpiration}
                ariaLabel="Teacher rubric expiration popup help"
                triggerClassName="ihb-trigger--section"
              />
            </h2>
            <div className="modal-form">
              <div className="modal-field">
                <label className="modal-label" htmlFor="save-expiration-date">
                  Date
                </label>
                <input
                  id="save-expiration-date"
                  type="date"
                  className="modal-input"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>
              <div className="modal-field">
                <label className="modal-label" htmlFor="save-expiration-time">
                  Time
                </label>
                <input
                  id="save-expiration-time"
                  type="time"
                  step="1"
                  className="modal-input"
                  value={expirationTime}
                  onChange={(e) => setExpirationTime(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-buttons">
              <button
                type="button"
                className="modal-button modal-button-cancel"
                onClick={() => setShowSaveExpirationModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-button modal-button-apply"
                onClick={handleConfirmSaveWithExpiration}
              >
                Set and Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RubricScoreDetail;
