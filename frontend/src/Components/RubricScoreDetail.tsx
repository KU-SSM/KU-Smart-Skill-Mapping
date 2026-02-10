import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineDelete } from 'react-icons/ai';
import RubricScoreTable from './RubricScoreTable';
import './RubricScore.css';

const DeleteIcon = AiOutlineDelete as React.ComponentType;

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
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // In a real app, fetch the rubric score data based on id
    // For now, using mock data
    const rubricScores: Record<string, { title: string; headers: string[]; rows: TableData[] }> = {
      '1': {
        title: 'Software Engineering Rubric',
        headers: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        rows: [
          { skillArea: 'Code Quality', values: ['Basic syntax', 'Clean code', 'Best practices', 'Design patterns'] },
          { skillArea: 'Testing', values: ['No tests', 'Unit tests', 'Integration tests', 'Full test coverage'] },
          { skillArea: 'Documentation', values: ['No docs', 'Basic comments', 'API docs', 'Comprehensive docs'] },
        ],
      },
      '2': {
        title: 'Data Science Rubric',
        headers: ['Novice', 'Competent', 'Proficient', 'Expert'],
        rows: [
          { skillArea: 'Data Analysis', values: ['Basic stats', 'EDA', 'Advanced analysis', 'Research-level'] },
          { skillArea: 'Modeling', values: ['Simple models', 'Multiple models', 'Ensemble methods', 'Custom models'] },
          { skillArea: 'Visualization', values: ['Basic charts', 'Good visuals', 'Interactive', 'Publication quality'] },
        ],
      },
      '3': {
        title: 'Web Development Rubric',
        headers: ['Level 1', 'Level 2', 'Level 3', 'Level 4'],
        rows: [
          { skillArea: 'Frontend', values: ['HTML/CSS', 'JavaScript', 'Frameworks', 'Advanced patterns'] },
          { skillArea: 'Backend', values: ['Basic API', 'Database integration', 'Authentication', 'Microservices'] },
          { skillArea: 'Deployment', values: ['Local only', 'Basic hosting', 'CI/CD', 'Cloud architecture'] },
        ],
      },
      '4': {
        title: 'Machine Learning Rubric',
        headers: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        rows: [
          { skillArea: 'Algorithms', values: ['Basic ML', 'Multiple algorithms', 'Deep learning', 'Research'] },
          { skillArea: 'Data Preprocessing', values: ['Raw data', 'Basic cleaning', 'Feature engineering', 'Advanced techniques'] },
          { skillArea: 'Evaluation', values: ['Accuracy only', 'Multiple metrics', 'Cross-validation', 'Advanced evaluation'] },
        ],
      },
    };

    const rubric = rubricScores[id || '1'];
    if (rubric) {
      setTitle(rubric.title);
      setHeaders(rubric.headers);
      setRows(rubric.rows);
    } else {
      // Default empty rubric
      setTitle('New Rubric Score');
      setHeaders([]);
      setRows([]);
    }
  }, [id]);

  const handleSaveChanges = () => {
    // In a real app, save to backend
    console.log('Saving rubric score:', { id, title, headers, rows });
  };

  const handleBack = () => {
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
            ← Back
          </button>
          <button className="save-changes-button" onClick={handleSaveChanges}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default RubricScoreDetail;
