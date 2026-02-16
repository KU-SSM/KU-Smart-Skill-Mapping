import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineDelete, AiOutlineArrowLeft } from 'react-icons/ai';
import { FiSave, FiX } from 'react-icons/fi';
import RubricScoreTable from './RubricScoreTable';
import { getRubricScore } from '../services/rubricScoreApi';
import './RubricScore.css';

const DeleteIcon = AiOutlineDelete as React.ComponentType;
const BackIcon = AiOutlineArrowLeft as React.ComponentType;
const SaveIcon = FiSave as React.ComponentType;
const CancelIcon = FiX as React.ComponentType;

interface TableData {
  skillArea: string;
  values: string[];
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
  const titleInputRef = useRef<HTMLInputElement>(null);

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
        
        setTitle(rubricData.title);
        setHeaders(rubricData.headers);
        setRows(rubricData.rows);
      } catch (error) {
        console.error('Error loading rubric score:', error);
        // Set default empty rubric on error
        setTitle('Rubric Score Not Found');
        setHeaders([]);
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRubricScore();
  }, [id]);

  const handleSaveChanges = () => {
    // In a real app, save to backend
    console.log('Saving rubric score:', { id, title, headers, rows });
  };

  const handleBack = () => {
    navigate('/rubric_score');
  };

  const handleCancel = () => {
    // Cancel changes and go back
    navigate('/rubric_score');
  };

  const handleDelete = () => {
    // In a real app, delete from backend
    console.log('Deleting rubric score:', id);
    // Navigate back to main page after deletion
    navigate('/rubric_score');
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
            className="delete-rubric-button" 
            onClick={handleDelete}
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
            <button className="cancel-changes-button" onClick={handleCancel}>
              {React.createElement(CancelIcon)}
              <span>Cancel</span>
            </button>
            <button className="save-changes-button" onClick={handleSaveChanges}>
              {React.createElement(SaveIcon)}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RubricScoreDetail;
