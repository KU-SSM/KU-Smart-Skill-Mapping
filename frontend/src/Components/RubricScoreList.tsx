import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose, AiOutlinePlus } from 'react-icons/ai';
import './RubricScore.css';

const CloseIcon = AiOutlineClose as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;

interface RubricScore {
  id: string;
  title: string;
}

const RubricScoreList: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([
    { id: '1', title: 'Software Engineering Rubric' },
    { id: '2', title: 'Data Science Rubric' },
    { id: '3', title: 'Web Development Rubric' },
    { id: '4', title: 'Machine Learning Rubric' },
  ]);

  const filteredRubricScores = useMemo(() => {
    if (!searchQuery.trim()) {
      return rubricScores;
    }
    const query = searchQuery.toLowerCase();
    return rubricScores.filter(rubric =>
      rubric.title.toLowerCase().includes(query)
    );
  }, [rubricScores, searchQuery]);

  const handleBarClick = (id: string) => {
    if (!isEditMode) {
      navigate(`/rubric_score/${id}`);
    } else {
      // Enable editing mode for this item
      const rubric = rubricScores.find(r => r.id === id);
      if (rubric) {
        setEditingId(id);
        setEditingTitle(rubric.title);
      }
    }
  };

  const handleEditMode = () => {
    if (isEditMode) {
      // Save any ongoing edits before exiting edit mode
      if (editingId && editingTitle.trim()) {
        setRubricScores(rubricScores.map(rubric =>
          rubric.id === editingId
            ? { ...rubric, title: editingTitle.trim() }
            : rubric
        ));
      }
      setEditingId(null);
      setEditingTitle('');
    }
    setIsEditMode(!isEditMode);
  };

  const handleDeleteRubric = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRubricScores(rubricScores.filter(rubric => rubric.id !== id));
  };

  const handleSave = () => {
    // Save functionality - can be implemented based on requirements
    console.log('Saving rubric scores...', rubricScores);
    // Add your save logic here (e.g., API call)
  };

  const handleAddNew = () => {
    const newId = String(Date.now());
    const newRubric: RubricScore = {
      id: newId,
      title: 'New Rubric Score'
    };
    setRubricScores([...rubricScores, newRubric]);
    setEditingId(newId);
    setEditingTitle('New Rubric Score');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (editingId && editingTitle.trim()) {
      setRubricScores(rubricScores.map(rubric =>
        rubric.id === editingId
          ? { ...rubric, title: editingTitle.trim() }
          : rubric
      ));
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingTitle('');
    }
  };

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  return (
    <div className="rubric-score-wrapper">
      <div className="rubric-score-container">
        <h1 className="rubric-score-title">Rubric Score</h1>
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
        <div className="rubric-score-bars-container">
          {filteredRubricScores.map((rubric) => (
            <div
              key={rubric.id}
              className="rubric-score-bar"
              onClick={() => !isEditMode && handleBarClick(rubric.id)}
            >
              {isEditMode && (
                <button
                  className="rubric-score-bar-delete-button"
                  onClick={(e) => handleDeleteRubric(e, rubric.id)}
                >
                  {React.createElement(CloseIcon)}
                </button>
              )}
              {editingId === rubric.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  className="rubric-score-bar-title-input"
                  value={editingTitle}
                  onChange={handleTitleChange}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="rubric-score-bar-title"
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      handleBarClick(rubric.id);
                    }
                  }}
                >
                  {rubric.title}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="rubric-score-list-button-container">
          {isEditMode && (
            <>
              <button 
                className="add-rubric-score-button"
                onClick={handleAddNew}
                title="Add New Rubric Score"
              >
                {React.createElement(PlusIcon)}
              </button>
              <button 
                className="save-rubric-score-button"
                onClick={handleSave}
              >
                Save
              </button>
            </>
          )}
          <button 
            className="edit-rubric-score-button"
            onClick={handleEditMode}
          >
            {isEditMode ? 'Done Editing' : 'Edit Rubric Score'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RubricScoreList;
