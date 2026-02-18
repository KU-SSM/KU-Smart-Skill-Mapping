import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineDelete, AiOutlineArrowLeft } from 'react-icons/ai';
import { FiSave, FiX } from 'react-icons/fi';
import RubricScoreTable from './RubricScoreTable';
import { getRubricScore, updateRubricScore } from '../services/rubricScoreApi';
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
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Store original data to restore on cancel
  const [originalTitle, setOriginalTitle] = useState<string>('');
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [originalRows, setOriginalRows] = useState<TableData[]>([]);

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
      } catch (error) {
        console.error('Error loading rubric score:', error);
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

  const handleSaveChanges = async () => {
    if (!id) {
      console.error('Cannot save: No rubric ID');
      return;
    }

    setIsSaving(true);

    try {
      console.log('Saving rubric score:', { id, title, headers, rows });
      
      // updateRubricScore returns the updated data, so we use it directly
      const rubricData = await updateRubricScore(id, {
        title,
        headers,
        rows,
      });

      console.log('Successfully saved rubric score!');
      
      // Update the state with the returned data (no need to fetch again)
      setTitle(rubricData.title);
      setHeaders(rubricData.headers);
      setRows(rubricData.rows);
      
      // Update original data to match saved data (deep copy to prevent mutation)
      setOriginalTitle(rubricData.title);
      setOriginalHeaders(rubricData.headers.map(h => h)); // Deep copy
      setOriginalRows(rubricData.rows.map(row => ({
        skillArea: row.skillArea,
        values: row.values.map(v => v) // Deep copy of values array
      })));
    } catch (error) {
      console.error('Error saving rubric score:', error);
    } finally {
      setIsSaving(false);
    }
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
            <button 
              className="save-changes-button" 
              onClick={handleSaveChanges}
              disabled={isSaving}
            >
              {React.createElement(SaveIcon)}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RubricScoreDetail;
