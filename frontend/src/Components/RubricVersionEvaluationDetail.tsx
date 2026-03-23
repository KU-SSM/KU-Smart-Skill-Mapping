import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RubricScoreTable from './RubricScoreTable';
import './RubricScore.css';
import { useAppRole } from '../context/AppRoleContext';

interface TableData {
  skillArea: string;
  values: string[];
}

interface EvaluationMaps {
  ai: { [skillArea: string]: string };
  student: { [skillArea: string]: string };
  teacher: { [skillArea: string]: string };
}

interface RubricVersionPayload {
  version: string;
  createdAt: string;
  expiresAt: string;
  title: string;
  headers: string[];
  rows: TableData[];
  evaluations?: EvaluationMaps;
}

interface LocationState {
  portfolioUsedTitle?: string;
  portfolioUsedFileName?: string;
  rubricId?: string;
  rubricVersion: RubricVersionPayload;
}

const RubricVersionEvaluationDetail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isStudent, isTeacher } = useAppRole();
  const panelsClass =
    isStudent || isTeacher ? 'profile2-two-panels' : 'profile2-three-panels';
  const state = (location.state || {}) as LocationState;

  const version = state.rubricVersion;
  const portfolioUsedFileName = state.portfolioUsedFileName || 'portfolio.pdf';

  const skillAreas = useMemo(() => version?.rows?.map((r) => r.skillArea) || [], [version]);
  const resolvedEvaluations = useMemo<EvaluationMaps>(() => {
    const ai: { [skillArea: string]: string } = {};
    const student: { [skillArea: string]: string } = {};
    const teacher: { [skillArea: string]: string } = {};

    skillAreas.forEach((skillArea) => {
      ai[skillArea] = version?.evaluations?.ai?.[skillArea] ?? '';
      student[skillArea] = version?.evaluations?.student?.[skillArea] ?? '';
      teacher[skillArea] = version?.evaluations?.teacher?.[skillArea] ?? '';
    });

    return { ai, student, teacher };
  }, [skillAreas, version]);

  if (!version) {
    return (
      <div className="rubric-score-wrapper">
        <div className="rubric-score-container">
          <h1 className="rubric-score-title">Version not found</h1>
          <button className="back-button" onClick={() => navigate('/profile2')}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrapper">
      {/* Header */}
      <div className="portfolio-container">
        <div className="portfolio-section">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'left', width: '100%' }}>
              <h2 className="portfolio-section-title" style={{ margin: 0 }}>
                {version.title}
              </h2>
              <p style={{ margin: '6px 0 0 0', color: '#666', fontSize: 14 }}>
                Created: {version.createdAt} • Expires: {version.expiresAt}
              </p>
              <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 14, display: 'block', textAlign: 'left' }}>
                Portfolio: {portfolioUsedFileName}
              </p>
            </div>
            <button className="profile3-back-button" onClick={() => navigate('/profile2')}>
              Back to Profile
            </button>
          </div>
        </div>
      </div>

      {/* Rubric (as of this version) */}
      <div className="portfolio-container">
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">Rubric (as of this version)</h2>
          <RubricScoreTable
            headers={version.headers}
            rows={version.rows}
            onHeadersChange={(_headers) => {}}
            onRowsChange={(_rows) => {}}
            readOnly
          />
        </div>
      </div>

      {/* Evaluation results (read-only) */}
      <div className="evaluation-container">
        <div className="evaluation-section">
          <h2 className="evaluation-section-title">Evaluation Results</h2>

          <div className={`skills-panels-container ${panelsClass}`}>
            <div className="skills-panel profile2-panel">
              <h2 className="panel-title">AI</h2>
              <div className="skills-list">
                {skillAreas.map((skillArea) => (
                  <div key={skillArea} className="skill-item profile2-skill-item">
                    <span className="skill-name">{skillArea}</span>
                    <input
                      type="text"
                      className="profile2-score-input ai-score-input"
                      value={resolvedEvaluations.ai[skillArea] || ''}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </div>

            {!isTeacher && (
            <div className="skills-panel profile2-panel">
              <h2 className="panel-title">Student</h2>
              <div className="skills-list">
                {skillAreas.map((skillArea) => (
                  <div key={skillArea} className="skill-item profile2-skill-item">
                    <span className="skill-name">{skillArea}</span>
                    <input
                      type="text"
                      className="profile2-score-input student-score-input"
                      value={resolvedEvaluations.student[skillArea] || ''}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </div>
            )}

            {!isStudent && (
            <div className="skills-panel profile2-panel">
              <h2 className="panel-title">Teacher</h2>
              <div className="skills-list">
                {skillAreas.map((skillArea) => (
                  <div key={skillArea} className="skill-item profile2-skill-item">
                    <span className="skill-name">{skillArea}</span>
                    <input
                      type="text"
                      className="profile2-score-input teacher-score-input"
                      value={resolvedEvaluations.teacher[skillArea] || ''}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default RubricVersionEvaluationDetail;

