import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import RubricScoreTable from './RubricScoreTable';
import { getRubricScore } from '../services/rubricScoreApi';
import './RubricScore.css';

const BackIcon = AiOutlineArrowLeft as React.ComponentType;

interface TableData {
  skillArea: string;
  values: string[];
}

const RubricScoreDetailStudent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<TableData[]>([]);
  const [title, setTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  const handleBack = () => {
    navigate('/rubric_score_student');
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
    </div>
  );
};

export default RubricScoreDetailStudent;
