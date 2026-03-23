import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineHistory } from 'react-icons/ai';
import { FiX } from 'react-icons/fi';
import RubricScoreTable from './RubricScoreTable';
import { getRubricScore } from '../services/rubricScoreApi';
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
  const [savedFormerRubricVersions, setSavedFormerRubricVersions] = useState<FormerRubricVersion[]>([]);

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

  const mockFormerRubricVersions = useMemo<FormerRubricVersion[]>(() => {
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

  const handleBack = () => {
    navigate('/rubric_score_student');
  };

  const handleOpenFormerRubrics = () => {
    setIsFormerRubricsOpen(true);
    setSelectedFormerVersion(null);
  };

  const handleCloseFormerRubrics = () => {
    setIsFormerRubricsOpen(false);
    setSelectedFormerVersion(null);
  };

  const handleOpenFormerVersion = (item: FormerRubricVersion) => {
    setSelectedFormerVersion(item);
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
    </div>
  );
};

export default RubricScoreDetailStudent;
