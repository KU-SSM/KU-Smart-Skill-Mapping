import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose } from 'react-icons/ai';
import './RubricScore.css';
import { getRubricScores } from '../services/rubricScoreApi';

const CloseIcon = AiOutlineClose as React.ComponentType;

interface RubricScore {
  id: string;
  title: string;
}

const RubricScoreListStudent: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);

  useEffect(() => {
    const loadRubricScores = async () => {
      try {
        setIsLoading(true);
        const scores = await getRubricScores();
        setRubricScores(scores);
      } catch (error: any) {
        console.error('Error loading rubric scores:', error);
        setRubricScores([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadRubricScores();
  }, []);

  const filteredRubricScores = useMemo(() => {
    if (!searchQuery.trim()) return rubricScores;
    const query = searchQuery.toLowerCase();
    return rubricScores.filter(rubric =>
      rubric.title.toLowerCase().includes(query)
    );
  }, [rubricScores, searchQuery]);

  const handleBarClick = (id: string) => {
    navigate(`/rubric_score_student/${id}`);
  };

  if (isLoading) {
    return (
      <div className="rubric-score-wrapper">
        <div className="rubric-score-container">
          <h1 className="rubric-score-title">Rubric Score</h1>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading rubric scores...</p>
          </div>
        </div>
      </div>
    );
  }

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
              onClick={() => handleBarClick(rubric.id)}
              style={{ cursor: 'pointer' }}
            >
              <span className="rubric-score-bar-title">{rubric.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RubricScoreListStudent;
