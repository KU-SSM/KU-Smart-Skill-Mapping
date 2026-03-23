import React, { useEffect, useMemo, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import './SkillMap.css';
import {
  MOCK_SKILL_EVALUATIONS,
  getMockEvaluationById,
  maxRankForRows,
  type SkillMapRadarRow,
} from '../services/skillMapMockData';

const PolarAngleAxisComponent = PolarAngleAxis as React.ComponentType<any>;
const PolarRadiusAxisComponent = PolarRadiusAxis as React.ComponentType<any>;

const PARTY_CONFIG = {
  student: { label: 'Student', stroke: '#3b82f6', fill: '#3b82f6' },
  ai: { label: 'AI', stroke: '#22c55e', fill: '#22c55e' },
  teacher: { label: 'Teacher', stroke: '#a855f7', fill: '#a855f7' },
} as const;

type PartyKey = keyof typeof PARTY_CONFIG;

const SkillMap: React.FC = () => {
  const defaultEvalId = MOCK_SKILL_EVALUATIONS[0]?.id ?? '';
  const [selectedEvalId, setSelectedEvalId] = useState<string>(defaultEvalId);
  const [showStudent, setShowStudent] = useState(true);
  const [showAi, setShowAi] = useState(true);
  const [showTeacher, setShowTeacher] = useState(true);

  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [pendingEvalId, setPendingEvalId] = useState<string>(defaultEvalId);

  const evaluation = useMemo(
    () => getMockEvaluationById(selectedEvalId),
    [selectedEvalId]
  );

  const chartData: SkillMapRadarRow[] = useMemo(
    () => evaluation?.rows ?? [],
    [evaluation]
  );

  const radiusMax = useMemo(() => maxRankForRows(chartData), [chartData]);

  const filteredModalEvaluations = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return MOCK_SKILL_EVALUATIONS;
    return MOCK_SKILL_EVALUATIONS.filter(
      (ev) =>
        ev.title.toLowerCase().includes(q) ||
        ev.rubricHint.toLowerCase().includes(q) ||
        ev.id.toLowerCase().includes(q)
    );
  }, [modalSearch]);

  const openEvalModal = () => {
    setPendingEvalId(selectedEvalId);
    setModalSearch('');
    setEvalModalOpen(true);
  };

  const closeEvalModal = () => {
    setEvalModalOpen(false);
    setModalSearch('');
  };

  const applyEvalSelection = () => {
    setSelectedEvalId(pendingEvalId);
    setEvalModalOpen(false);
    setModalSearch('');
  };

  useEffect(() => {
    if (!evalModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEvalModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [evalModalOpen]);

  const anyPartyVisible = showStudent || showAi || showTeacher;

  return (
    <div className="skill-map-wrapper">
      <div className="skill-map-container">
        <div className="skill-map-chart-container">
          <h1 className="skill-map-title">Skill Map</h1>
          <div className="radar-chart-wrapper">
            {!anyPartyVisible ? (
              <div className="skill-map-chart-empty">
                Turn on at least one party below to see the radar chart.
              </div>
            ) : chartData.length === 0 ? (
              <div className="skill-map-chart-empty">No skills for this evaluation.</div>
            ) : (
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart
                  data={chartData}
                  margin={{ top: 20, right: 36, bottom: 20, left: 36 }}
                >
                  <PolarGrid stroke="#ccc" />
                  <PolarAngleAxisComponent
                    dataKey="skill"
                    tick={{ fill: '#333', fontSize: 11 }}
                    tickLine={{ stroke: '#ccc' }}
                  />
                  <PolarRadiusAxisComponent
                    angle={90}
                    domain={[0, radiusMax]}
                    tick={{ fill: '#666', fontSize: 10 }}
                    tickCount={Math.min(radiusMax + 1, 6)}
                  />
                  {showStudent && (
                    <Radar
                      name={PARTY_CONFIG.student.label}
                      dataKey="student"
                      stroke={PARTY_CONFIG.student.stroke}
                      fill={PARTY_CONFIG.student.fill}
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                  )}
                  {showAi && (
                    <Radar
                      name={PARTY_CONFIG.ai.label}
                      dataKey="ai"
                      stroke={PARTY_CONFIG.ai.stroke}
                      fill={PARTY_CONFIG.ai.fill}
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                  )}
                  {showTeacher && (
                    <Radar
                      name={PARTY_CONFIG.teacher.label}
                      dataKey="teacher"
                      stroke={PARTY_CONFIG.teacher.stroke}
                      fill={PARTY_CONFIG.teacher.fill}
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                  )}
                  <Legend wrapperStyle={{ paddingTop: '16px' }} iconType="circle" />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <aside className="skill-map-sidebar">
          <div className="skill-map-panel">
            <div className="label-bar">
              <span className="label-text">Select evaluation</span>
            </div>
            <div className="skill-map-eval-picker">
              <span className="skill-map-eval-label" id="skill-map-eval-label">
                Evaluation
              </span>
              <div className="skill-map-eval-row">
                <span
                  className="skill-map-eval-name"
                  title={evaluation?.title ?? ''}
                  aria-labelledby="skill-map-eval-label"
                >
                  {evaluation?.title ?? '—'}
                </span>
                <button
                  type="button"
                  className="skill-map-eval-choose-btn"
                  onClick={openEvalModal}
                  aria-haspopup="dialog"
                  aria-expanded={evalModalOpen}
                >
                  Choose…
                </button>
              </div>
            </div>
          </div>

          <div className="skill-map-panel">
            <div className="label-bar">
              <span className="label-text">Show on chart</span>
            </div>
            <p className="skill-map-hint">Include or remove each party from the radar.</p>
            <fieldset className="skill-map-toggles">
              <legend className="skill-map-sr-only">Parties to display</legend>
              {(Object.keys(PARTY_CONFIG) as PartyKey[]).map((key) => {
                const cfg = PARTY_CONFIG[key];
                const checked =
                  key === 'student'
                    ? showStudent
                    : key === 'ai'
                      ? showAi
                      : showTeacher;
                const onChange =
                  key === 'student'
                    ? () => setShowStudent((v) => !v)
                    : key === 'ai'
                      ? () => setShowAi((v) => !v)
                      : () => setShowTeacher((v) => !v);
                return (
                  <label key={key} className="skill-map-toggle-row">
                    <input type="checkbox" checked={checked} onChange={onChange} />
                    <span
                      className="skill-map-toggle-swatch"
                      style={{ backgroundColor: cfg.fill }}
                      aria-hidden
                    />
                    <span>{cfg.label}</span>
                  </label>
                );
              })}
            </fieldset>
          </div>
        </aside>
      </div>

      {evaluation?.rubricScore && (
        <section className="skill-map-rubric-session" aria-labelledby="skill-map-rubric-session-title">
          <div className="skill-map-rubric-session-head">
            <h2 id="skill-map-rubric-session-title" className="skill-map-title">
              Rubric Score
              <span className="skill-map-rubric-session-title-name">
                {' '}
                - {evaluation.rubricScore.title}
              </span>
            </h2>
          </div>
          <div className="skill-map-rubric-table-scroll">
            <table className="skill-map-rubric-table">
              <thead>
                <tr>
                  <th scope="col" className="skill-map-rubric-th-skill">
                    Skill area
                  </th>
                  {evaluation.rubricScore.headers.map((header, i) => (
                    <th key={i} scope="col" className="skill-map-rubric-th-level">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evaluation.rubricScore.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <th scope="row" className="skill-map-rubric-row-skill">
                      {row.skillArea}
                    </th>
                    {evaluation.rubricScore.headers.map((_, colIndex) => (
                      <td key={colIndex} className="skill-map-rubric-cell">
                        {row.values[colIndex] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {evalModalOpen && (
        <div
          className="skill-map-modal-overlay"
          role="presentation"
          onClick={closeEvalModal}
        >
          <div
            className="skill-map-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skill-map-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="skill-map-modal-header">
              <h2 id="skill-map-modal-title" className="skill-map-modal-title">
                Select evaluation
              </h2>
              <button
                type="button"
                className="skill-map-modal-close"
                onClick={closeEvalModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="skill-map-modal-search">
              <input
                type="search"
                className="skill-map-modal-search-input"
                placeholder="Search evaluations…"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                aria-label="Search evaluations"
                autoFocus
              />
            </div>
            <ul className="skill-map-modal-list" role="listbox" aria-label="Evaluations">
              {filteredModalEvaluations.length === 0 ? (
                <li className="skill-map-modal-empty">No matching evaluations.</li>
              ) : (
                filteredModalEvaluations.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={pendingEvalId === ev.id}
                      className={
                        pendingEvalId === ev.id
                          ? 'skill-map-modal-item skill-map-modal-item-selected'
                          : 'skill-map-modal-item'
                      }
                      onClick={() => setPendingEvalId(ev.id)}
                    >
                      <span className="skill-map-modal-item-title">{ev.title}</span>
                      <span className="skill-map-modal-item-hint">{ev.rubricHint}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="skill-map-modal-actions">
              <button
                type="button"
                className="skill-map-modal-btn skill-map-modal-btn-secondary"
                onClick={closeEvalModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="skill-map-modal-btn skill-map-modal-btn-primary"
                onClick={applyEvalSelection}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillMap;
