import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose, AiOutlinePlus } from 'react-icons/ai';
import './RubricScore.css';
import { getRubricScores, createRubricScore, deleteRubricScore } from '../services/rubricScoreApi';
import { getApiErrorDetail } from '../utils/apiErrors';
import InstructionHelpBubble from './InstructionHelpBubble';
import { instructionTeacherRubricManage } from './instructionHelpContent';

const CloseIcon = AiOutlineClose as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;

interface RubricScore {
  id: string;
  title: string;
}

const RubricScoreList: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddingRubric, setIsAddingRubric] = useState<boolean>(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);

  const lastPersistedTitleRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const loadRubricScores = async () => {
      try {
        setIsLoading(true);
        const scores = await getRubricScores();
        const normalized = scores.map(score => ({ id: score.id, title: score.title }));
        lastPersistedTitleRef.current = Object.fromEntries(
          normalized.map(s => [s.id, s.title])
        );
        setRubricScores(normalized);
      } catch (error: unknown) {
        console.error('Error loading rubric scores:', error);
        alert(`Error: ${getApiErrorDetail(error) || 'Failed to load rubric scores'}`);
        setRubricScores([]);
        lastPersistedTitleRef.current = {};
      } finally {
        setIsLoading(false);
      }
    };

    loadRubricScores();
  }, []);

  const filteredRubricScores = useMemo(() => {
    if (!searchQuery.trim()) {
      return rubricScores;
    }
    const query = searchQuery.toLowerCase();
    return rubricScores.filter(rubric => rubric.title.toLowerCase().includes(query));
  }, [rubricScores, searchQuery]);

  const openRubricDetail = (rubric: RubricScore) => {
    navigate(`/rubric_score/${rubric.id}`);
  };

  const handleDeleteRubric = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingIds.has(id) || isAddingRubric) return;

    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await deleteRubricScore(id);
      delete lastPersistedTitleRef.current[id];
      setRubricScores(prev => prev.filter(r => r.id !== id));
    } catch (error: unknown) {
      alert(`Error: ${getApiErrorDetail(error) || 'Failed to delete rubric'}`);
    } finally {
      setDeletingIds(prev => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  const handleAddNew = async () => {
    if (isAddingRubric) return;

    setIsAddingRubric(true);
    try {
      const result = await createRubricScore({
        title: 'New Rubric Score',
        headers: [],
        rows: []
      });
      const title =
        result.title && result.title.trim() !== '' ? result.title.trim() : 'New Rubric Score';
      lastPersistedTitleRef.current[result.id] = title;
      setRubricScores(prev => [...prev, { id: result.id, title }]);
    } catch (error: unknown) {
      alert(`Error: ${getApiErrorDetail(error) || 'Failed to create rubric'}`);
    } finally {
      setIsAddingRubric(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rubric-score-wrapper">
        <div className="rubric-score-container">
          <div className="rubric-score-title-row">
            <h1 className="rubric-score-title">Rubric Score</h1>
            <InstructionHelpBubble
              content={instructionTeacherRubricManage}
              ariaLabel="Rubrics manage page help"
            />
          </div>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading rubric scores...</p>
          </div>
        </div>
      </div>
    );
  }

  const rowBusy = (id: string) => deletingIds.has(id);

  return (
    <div className="rubric-score-wrapper">
      <div className="rubric-score-container">
        <div className="rubric-score-title-row">
          <h1 className="rubric-score-title">Rubric Score</h1>
          <InstructionHelpBubble
            content={instructionTeacherRubricManage}
            ariaLabel="Rubrics manage page help"
          />
        </div>
        <div className="rubric-score-search-container">
          <input
            type="text"
            className="rubric-score-search-input"
            placeholder="Search rubric scores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="rubric-score-clear-search"
              onClick={() => setSearchQuery('')}
            >
              {React.createElement(CloseIcon)}
            </button>
          )}
        </div>
        <div className="rubric-score-bars-container rubric-score-bars-container--scrollable">
          {filteredRubricScores.map((rubric) => (
            <div key={rubric.id} className="rubric-score-bar rubric-score-bar--manage">
              <button
                type="button"
                className="rubric-score-bar-delete-button"
                onClick={(e) => void handleDeleteRubric(e, rubric.id)}
                disabled={rowBusy(rubric.id) || isAddingRubric}
                title="Delete rubric score"
              >
                {React.createElement(CloseIcon)}
              </button>
              <input
                type="text"
                className="rubric-score-bar-title-input rubric-score-bar-title-input--manage"
                value={rubric.title}
                placeholder="Rubric name"
                aria-label="Rubric name"
                readOnly
              />
              <button
                type="button"
                className="rubric-score-bar-open-button"
                disabled={rowBusy(rubric.id) || isAddingRubric}
                onClick={() => void openRubricDetail(rubric)}
                title="Open rubric table"
              >
                Open
              </button>
            </div>
          ))}
          {!searchQuery.trim() && (
            <div
              className="rubric-score-add-box"
              onClick={() => {
                if (!isAddingRubric) void handleAddNew();
              }}
              style={isAddingRubric ? { pointerEvents: 'none', opacity: 0.65 } : undefined}
            >
              <span className="rubric-score-add-box-spacer"></span>
              <button
                type="button"
                className="rubric-score-add-box-button"
                disabled={isAddingRubric}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleAddNew();
                }}
                title={isAddingRubric ? 'Creating…' : 'Add New Rubric Score'}
              >
                {React.createElement(PlusIcon)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RubricScoreList;
