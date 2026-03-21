import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineDelete, AiOutlineArrowLeft, AiOutlineHistory } from 'react-icons/ai';
import { FiSave, FiX } from 'react-icons/fi';
import RubricScoreTable from './RubricScoreTable';
import { getRubricScore, updateRubricScore, deleteRubricScore } from '../services/rubricScoreApi';
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
  
  // Store original data to restore on cancel
  const [originalTitle, setOriginalTitle] = useState<string>('');
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [originalRows, setOriginalRows] = useState<TableData[]>([]);

  const [expirationDate, setExpirationDate] = useState<string>('');
  const [expirationTime, setExpirationTime] = useState<string>('23:59:59');
  const [isFormerRubricsOpen, setIsFormerRubricsOpen] = useState<boolean>(false);
  const [selectedFormerVersion, setSelectedFormerVersion] = useState<FormerRubricVersion | null>(null);
  const [savedFormerRubricVersions, setSavedFormerRubricVersions] = useState<FormerRubricVersion[]>([]);
  const [showFormerExpirationModal, setShowFormerExpirationModal] = useState<boolean>(false);

  const getDefaultExpirationDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  };

  const historyStorageKey = useMemo(() => {
    if (!id) return null;
    return `former_rubric_versions_${id}`;
  }, [id]);

  // Load persisted former rubric versions (frontend-only mock).
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

  // Persist whenever former versions change.
  useEffect(() => {
    if (!historyStorageKey) return;
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(savedFormerRubricVersions));
    } catch {
      // Ignore quota/localStorage errors
    }
  }, [historyStorageKey, savedFormerRubricVersions]);

  const mockFormerRubricVersions = useMemo<FormerRubricVersion[]>(() => {
    // Mock data (no backend yet)
    const now = new Date();
    const iso = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);
    const d1 = new Date(now);
    d1.setDate(d1.getDate() + 2);
    d1.setHours(23, 59, 59, 0);
    const d2 = new Date(now);
    d2.setDate(d2.getDate() + 10);
    d2.setHours(23, 59, 59, 0);
    return [
      {
        version: 'v1',
        title: `${title || 'Rubric'} (v1)`,
        createdAt: iso(new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)),
        expiresAt: iso(d1),
        headers: ['Level 1', 'Level 2', 'Level 3'],
        rows: [
          { skillArea: 'Communication', values: ['Basic', 'Good', 'Excellent'] },
          { skillArea: 'Teamwork', values: ['Basic', 'Good', 'Excellent'] },
        ],
      },
      {
        version: 'v2',
        title: `${title || 'Rubric'} (v2)`,
        createdAt: iso(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
        expiresAt: iso(d2),
        headers: ['Level 1', 'Level 2', 'Level 3', 'Level 4'],
        rows: [
          { skillArea: 'Communication', values: ['Basic', 'Good', 'Great', 'Exceptional'] },
          { skillArea: 'Teamwork', values: ['Basic', 'Good', 'Great', 'Exceptional'] },
          { skillArea: 'Problem Solving', values: ['Basic', 'Good', 'Great', 'Exceptional'] },
        ],
      },
    ];
  }, [title]);

  const formerRubricVersions =
    savedFormerRubricVersions.length > 0 ? savedFormerRubricVersions : mockFormerRubricVersions;

  useEffect(() => {
    const loadRubricScore = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('Loading rubric score with ID:', id);
        const rubricData = await getRubricScore(id);
        console.log('Loaded rubric score:', rubricData);
        
        // Set current data
        setTitle(rubricData.title);
        setHeaders(rubricData.headers);
        setRows(rubricData.rows);
        
        // Store original data for cancel functionality (deep copy to prevent mutation)
        setOriginalTitle(rubricData.title);
        setOriginalHeaders(rubricData.headers.map(h => h)); // Deep copy
        setOriginalRows(rubricData.rows.map(row => ({
          skillArea: row.skillArea,
          values: row.values.map(v => v) // Deep copy of values array
        })));
      } catch (error: any) {
        console.error('Error loading rubric score:', error);
        const errorMessage = error?.message || 'Failed to load rubric score';
        alert(`Error: ${errorMessage}`);
        // Set default empty rubric on error
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

  const performSave = async (saveExpirationDate?: string, saveExpirationTime?: string) => {
    if (!id) {
      console.error('Cannot save: No rubric ID');
      return;
    }

    setIsSaving(true);

    try {
      console.log('Saving rubric score:', { id, title, headers, rows });
      console.log('Previous version expiration:', expirationDate, expirationTime);

      const rubricData = await updateRubricScore(id, {
        title,
        headers,
        rows,
      });

      console.log('Successfully saved rubric score!');
      console.log('Returned data:', rubricData);

      // Save former rubric history (frontend-only).
      // If backend save fails, we won't reach this code because it's inside `try`.
      const effectiveExpirationDate = saveExpirationDate ?? expirationDate;
      const effectiveExpirationTime = saveExpirationTime ?? expirationTime;
      const expiresAt = `${effectiveExpirationDate} ${effectiveExpirationTime}`.trim();
      if (historyStorageKey && originalTitle && originalHeaders.length > 0 && originalRows.length > 0 && expiresAt) {
        const snapshotBase = {
          title: `${originalTitle} (snapshot)`,
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
            // ignore
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

    } catch (error: any) {
      console.error('Error saving rubric score:', error);
      const errorMessage = error?.message || 'Failed to save rubric score. Please check the console for details.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChanges = () => {
    const defaultExpirationDate = getDefaultExpirationDate();
    const defaultExpirationTime = '23:59:59';
    setExpirationDate(defaultExpirationDate);
    setExpirationTime(defaultExpirationTime);
    performSave(defaultExpirationDate, defaultExpirationTime);
  };

  const handleOpenFormerRubrics = () => {
    setIsFormerRubricsOpen(true);
    setSelectedFormerVersion(null);
  };

  const handleCloseFormerRubrics = () => {
    setIsFormerRubricsOpen(false);
    setSelectedFormerVersion(null);
    setShowFormerExpirationModal(false);
  };

  const handleOpenFormerVersion = (item: FormerRubricVersion) => {
    setSelectedFormerVersion(item);
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

  const handleConfirmFormerExpirationAndSaveMock = () => {
    if (!selectedFormerVersion) return;
    const nextExpiresAt = `${expirationDate} ${expirationTime}`.trim();
    if (!nextExpiresAt) return;

    setSavedFormerRubricVersions((prev) => {
      const base = prev.length > 0 ? prev : mockFormerRubricVersions;
      const updated = base.map((v) =>
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
    // Cancel all changes - restore original data and stay on the page
    // Always restore to original values (create new references to ensure React detects the change)
    setTitle(originalTitle);
    setEditingTitle(originalTitle);
    setHeaders(originalHeaders.map(h => h)); // Create new array with deep copy
    setRows(originalRows.map(row => ({
      skillArea: row.skillArea,
      values: row.values.map(v => v) // Create new array for values with deep copy
    })));
    
    // Close title editing if active
    setIsEditingTitle(false);
  };

  const handleDelete = async () => {
    if (!id) {
      console.error('Cannot delete: No rubric ID');
      return;
    }

    setIsDeleting(true);

    try {
      console.log('Deleting rubric score:', id);
      await deleteRubricScore(id);
      console.log('Successfully deleted rubric score!');
      
      // Navigate back to main page after successful deletion
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

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    // Check if title changed (including if currently editing)
    const titleChanged = isEditingTitle 
      ? editingTitle.trim() !== originalTitle
      : title !== originalTitle;
    
    // Check if headers changed
    const headersChanged = headers.length !== originalHeaders.length ||
      headers.some((h, i) => h !== (originalHeaders[i] || ''));
    
    // Check if rows changed
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
                {selectedFormerVersion ? 'Former rubric detail' : 'Former rubric versions'}
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
            {selectedFormerVersion ? (
              <>
                <div className="rubric-history-detail-meta">
                  <div>Name: {selectedFormerVersion.version}</div>
                  <div>Created: {selectedFormerVersion.createdAt}</div>
                  <div>Expires: {selectedFormerVersion.expiresAt}</div>
                </div>
                <RubricScoreTable
                  headers={selectedFormerVersion.headers}
                  rows={selectedFormerVersion.rows}
                  onHeadersChange={() => {}}
                  onRowsChange={() => {}}
                  readOnly={true}
                />
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
                  {formerRubricVersions.map((item) => (
                    <button
                      key={item.version}
                      type="button"
                      className="rubric-history-item rubric-history-item-button"
                      onClick={() => handleOpenFormerVersion(item)}
                    >
                      <div className="rubric-history-left">
                        <div className="rubric-history-version">{item.version}</div>
                        <div className="rubric-history-meta">Created: {item.createdAt}</div>
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

      {/* Edit expiration date for selected former version */}
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
                onClick={handleConfirmFormerExpirationAndSaveMock}
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
