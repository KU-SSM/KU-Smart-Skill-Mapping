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
import api from '../api/index';
import {
  getSkillEvaluations,
  getSkillEvaluationsByUser,
  type SkillEvaluationRecord,
} from '../services/skillEvaluationApi';
import { getCurrentUserId } from '../utils/currentUser';
import { useAppRole } from '../context/AppRoleContext';
import InstructionHelpBubble from './InstructionHelpBubble';
import { instructionStudentSkillMap, instructionTeacherSkillMap } from './instructionHelpContent';

const PolarAngleAxisComponent = PolarAngleAxis as React.ComponentType<any>;
const PolarRadiusAxisComponent = PolarRadiusAxis as React.ComponentType<any>;

const PARTY_CONFIG = {
  student: { label: 'Student', stroke: '#3b82f6', fill: '#3b82f6' },
  ai: { label: 'AI', stroke: '#22c55e', fill: '#22c55e' },
  teacher: { label: 'Teacher', stroke: '#a855f7', fill: '#a855f7' },
} as const;

type PartyKey = keyof typeof PARTY_CONFIG;

interface SkillMapRadarRow {
  skill: string;
  student: number;
  ai: number;
  teacher: number;
}

interface RubricTableData {
  skillArea: string;
  values: string[];
}

interface RubricScoreSession {
  title: string;
  headers: string[];
  rows: RubricTableData[];
}

interface SkillMapEvaluation {
  id: string;
  title: string;
  rubricHint: string;
  status: 'pending' | 'completed' | 'approved';
  rubricMaxRank: number;
  rows: SkillMapRadarRow[];
  aiCriteriaParsingRows: {
    skillName: string;
    levelRank: number;
    criteriaPassingDescription: string;
  }[];
  rubricScore: RubricScoreSession;
}

interface SkillEvaluationFullResponse {
  id: number;
  rubric_score_history_id: number;
  portfolio_id: number;
  user_id: number;
  created_at?: string;
  status: string;
  ai_evaluated_skills: {
    skill_name: string;
    level_rank: number;
    criteria_passing_description?: string | null;
  }[];
  student_evaluated_skills: { skill_name: string; level_rank: number }[];
  teacher_evaluated_skills: { skill_name: string; level_rank: number }[];
}

interface RubricHistoryResponse {
  id: number;
  rubric_score_id: number;
}

interface RubricResponse {
  id: number;
  name: string;
}

interface RubricSkillHistoryResponse {
  id: number;
  rubric_history_id: number;
  name: string;
  display_order?: number | null;
}

interface LevelHistoryResponse {
  id: number;
  rubric_history_id: number;
  rank?: number | null;
  description?: string | null;
}

interface CriteriaHistoryResponse {
  id: number;
  rubric_skill_history_id: number;
  level_history_id: number;
  description?: string | null;
}

interface BackendRubricSkill {
  id: number;
  rubric_id: number;
  display_order: number;
  name: string;
}

interface BackendLevel {
  id: number;
  rubric_id: number;
  rank: number;
  description: string | null;
}

interface BackendCriteria {
  id: number;
  rubric_skill_id: number;
  level_id: number;
  description: string;
}

const toPositiveInt = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

const scoreMapFromRows = (rows: { skill_name: string; level_rank: number }[]) => {
  const out: Record<string, number> = {};
  rows.forEach((row) => {
    if (!row.skill_name || !row.skill_name.trim()) return;
    out[row.skill_name] = toPositiveInt(row.level_rank);
  });
  return out;
};

const maxRankForRows = (rows: SkillMapRadarRow[]): number => {
  let m = 0;
  for (const r of rows) {
    m = Math.max(m, r.student, r.ai, r.teacher);
  }
  return m;
};

const rubricAxisMaxFromLevels = (levels: { rank?: number | null }[]): number => {
  if (!levels.length) return 1;
  const ranks = levels.map((l) => toPositiveInt(l.rank));
  const maxR = Math.max(0, ...ranks);
  const n = levels.length;
  if (maxR > 0) return Math.max(maxR, n);
  return Math.max(1, n);
};

const toRadarAxisLabel = (value: string): string => {
  const clean = value.trim();
  if (clean.length <= 18) return clean;
  return `${clean.slice(0, 16)}...`;
};

const toStatusLabel = (status?: string): 'Pending' | 'Approved' | 'Completed' => {
  if (status === 'pending') return 'Pending';
  if (status === 'approved') return 'Approved';
  return 'Completed';
};

const SkillMap: React.FC = () => {
  const { isTeacher } = useAppRole();
  const [availableEvaluations, setAvailableEvaluations] = useState<SkillEvaluationRecord[]>([]);
  const [evaluationCache, setEvaluationCache] = useState<Record<string, SkillMapEvaluation>>({});
  const [rubricTitleByHistoryId, setRubricTitleByHistoryId] = useState<Record<number, string>>({});
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState<boolean>(true);
  const [isLoadingSelected, setIsLoadingSelected] = useState<boolean>(false);

  const [showStudent, setShowStudent] = useState(true);
  const [showAi, setShowAi] = useState(true);
  const [showTeacher, setShowTeacher] = useState(true);

  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [pendingEvalId, setPendingEvalId] = useState<string>('');

  const evaluation = useMemo(() => evaluationCache[selectedEvalId], [evaluationCache, selectedEvalId]);

  const chartData: SkillMapRadarRow[] = useMemo(
    () => evaluation?.rows ?? [],
    [evaluation]
  );

  const radiusMax = useMemo(() => {
    const fromData = maxRankForRows(chartData);
    const fromRubric =
      evaluation?.rubricMaxRank ??
      (evaluation?.rubricScore?.headers?.length
        ? Math.max(1, evaluation.rubricScore.headers.length)
        : 0);
    if (fromRubric > 0) return Math.max(fromRubric, fromData);
    return Math.max(1, fromData);
  }, [chartData, evaluation?.rubricMaxRank, evaluation?.rubricScore?.headers]);

  const filteredModalEvaluations = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return availableEvaluations;
    return availableEvaluations.filter(
      (ev) =>
        (rubricTitleByHistoryId[ev.rubric_score_history_id] || '').toLowerCase().includes(q) ||
        `Evaluation #${ev.id}`.toLowerCase().includes(q) ||
        String(ev.id).toLowerCase().includes(q) ||
        (ev.status || '').toLowerCase().includes(q)
    );
  }, [modalSearch, availableEvaluations, rubricTitleByHistoryId]);

  useEffect(() => {
    const loadAvailableEvaluations = async () => {
      try {
        setIsLoadingEvaluations(true);
        const rows = isTeacher
          ? await getSkillEvaluations()
          : await getSkillEvaluationsByUser(getCurrentUserId());
        const eligible = rows;
        setAvailableEvaluations(eligible);
        const uniqueHistoryIds = Array.from(
          new Set(rows.map((row) => row.rubric_score_history_id))
        );
        const resolvedPairs = await Promise.all(
          uniqueHistoryIds.map(async (historyId) => {
            try {
              const historyRes = await api.get<RubricHistoryResponse>(`rubric_score_history/${historyId}`);
              const rubricRes = await api.get<RubricResponse>(`rubric/${historyRes.data.rubric_score_id}`);
              return [historyId, rubricRes.data.name || `Rubric #${historyRes.data.rubric_score_id}`] as const;
            } catch {
              return [historyId, `History #${historyId}`] as const;
            }
          })
        );
        setRubricTitleByHistoryId(
          resolvedPairs.reduce<Record<number, string>>((acc, [historyId, title]) => {
            acc[historyId] = title;
            return acc;
          }, {})
        );
        setSelectedEvalId('');
        setPendingEvalId('');
      } catch (error) {
        console.error('Failed to load evaluations for skill map:', error);
        setAvailableEvaluations([]);
        setSelectedEvalId('');
        setPendingEvalId('');
      } finally {
        setIsLoadingEvaluations(false);
      }
    };
    void loadAvailableEvaluations();
  }, [isTeacher]);

  useEffect(() => {
    const loadSelectedEvaluation = async () => {
      if (!selectedEvalId) return;
      if (evaluationCache[selectedEvalId]) return;

      const evalIdNum = Number(selectedEvalId);
      if (!Number.isInteger(evalIdNum) || evalIdNum <= 0) return;

      try {
        setIsLoadingSelected(true);
        const fullRes = await api.get<SkillEvaluationFullResponse>(`skill_evaluation/${evalIdNum}/full`);
        const full = fullRes.data;

        const [historyRes, skillHistoryRes, levelHistoryRes, criteriaHistoryRes] = await Promise.all([
          api.get<RubricHistoryResponse>(`rubric_score_history/${full.rubric_score_history_id}`),
          api.get<RubricSkillHistoryResponse[]>(
            `rubric_score_history/${full.rubric_score_history_id}/rubric_skills`
          ),
          api.get<LevelHistoryResponse[]>(
            `rubric_score_history/${full.rubric_score_history_id}/levels`
          ),
          api.get<CriteriaHistoryResponse[]>(
            `rubric_score_history/${full.rubric_score_history_id}/criteria`
          ),
        ]);

        const rubricId = historyRes.data.rubric_score_id;
        let rubricTitle = `Rubric #${rubricId}`;
        try {
          const rubricRes = await api.get<RubricResponse>(`rubric/${rubricId}`);
          rubricTitle = rubricRes.data.name || rubricTitle;
        } catch {
        }

        let skills: { id: number; name: string; display_order?: number | null }[] = [];
        let levels: { id: number; rank?: number | null; description?: string | null }[] = [];
        let headers: string[] = [];
        let criteriaBySkillId = new Map<number, Map<number, string>>();

        const hasHistorySnapshot =
          skillHistoryRes.data.length > 0 && levelHistoryRes.data.length > 0;

        if (hasHistorySnapshot) {
          skills = [...skillHistoryRes.data].sort(
            (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
          );
          levels = [...levelHistoryRes.data].sort(
            (a, b) => (a.rank ?? 0) - (b.rank ?? 0)
          );
          headers = levels.map((l) =>
            l.description && l.description.trim() ? l.description : `Level ${l.rank ?? 0}`
          );
          criteriaHistoryRes.data.forEach((c) => {
            if (!criteriaBySkillId.has(c.rubric_skill_history_id)) {
              criteriaBySkillId.set(c.rubric_skill_history_id, new Map<number, string>());
            }
            const perSkill = criteriaBySkillId.get(c.rubric_skill_history_id)!;
            perSkill.set(c.level_history_id, c.description ?? '');
          });
        } else {
          const [rubricSkillsRes, rubricLevelsRes, rubricCriteriaRes] = await Promise.all([
            api.get<BackendRubricSkill[]>(`rubric/${rubricId}/rubric_skills`),
            api.get<BackendLevel[]>(`rubric/${rubricId}/levels`),
            api.get<BackendCriteria[]>(`rubric/${rubricId}/criteria`),
          ]);
          skills = [...rubricSkillsRes.data].sort(
            (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
          );
          levels = [...rubricLevelsRes.data].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
          headers = levels.map((l) =>
            l.description && l.description.trim() ? l.description : `Level ${l.rank ?? 0}`
          );
          rubricCriteriaRes.data.forEach((c) => {
            if (!criteriaBySkillId.has(c.rubric_skill_id)) {
              criteriaBySkillId.set(c.rubric_skill_id, new Map<number, string>());
            }
            const perSkill = criteriaBySkillId.get(c.rubric_skill_id)!;
            perSkill.set(c.level_id, c.description ?? '');
          });
        }

        const studentScoreMap = scoreMapFromRows(full.student_evaluated_skills || []);
        const aiScoreMap = scoreMapFromRows(full.ai_evaluated_skills || []);
        const teacherScoreMap = scoreMapFromRows(full.teacher_evaluated_skills || []);

        const radarRows: SkillMapRadarRow[] = skills.map((s) => ({
          skill: s.name,
          student: studentScoreMap[s.name] ?? 0,
          ai: aiScoreMap[s.name] ?? 0,
          teacher: teacherScoreMap[s.name] ?? 0,
        }));
        const aiCriteriaParsingRows = (full.ai_evaluated_skills || []).map((row) => ({
          skillName: row.skill_name,
          levelRank: toPositiveInt(row.level_rank),
          criteriaPassingDescription: (row.criteria_passing_description || '').trim(),
        }));

        const rubricRows: RubricTableData[] = skills.map((s) => {
          const perSkill = criteriaBySkillId.get(s.id) || new Map<number, string>();
          const values = levels.map((lv) => perSkill.get(lv.id) ?? '—');
          return { skillArea: s.name, values };
        });

        const mapped: SkillMapEvaluation = {
          id: selectedEvalId,
          title: rubricTitle || `Evaluation #${full.id}`,
          rubricHint: rubricTitle,
          status: full.status === 'pending' ? 'pending' : full.status === 'approved' ? 'approved' : 'completed',
          rubricMaxRank: rubricAxisMaxFromLevels(levels),
          rows: radarRows,
          aiCriteriaParsingRows,
          rubricScore: {
            title: rubricTitle,
            headers,
            rows: rubricRows,
          },
        };

        setEvaluationCache((prev) => ({ ...prev, [selectedEvalId]: mapped }));
      } catch (error) {
        console.error('Failed to load selected evaluation:', error);
      } finally {
        setIsLoadingSelected(false);
      }
    };

    void loadSelectedEvaluation();
  }, [selectedEvalId, evaluationCache]);

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
    if (!pendingEvalId) return;
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
          <div className="skill-map-title-row">
            <h1 className="skill-map-title">Skill Map</h1>
            <InstructionHelpBubble
              content={isTeacher ? instructionTeacherSkillMap : instructionStudentSkillMap}
              ariaLabel="Skill map page help"
            />
          </div>
          <div className="radar-chart-wrapper">
            {!anyPartyVisible ? (
              <div className="skill-map-chart-empty">
                Turn on at least one party below to see the radar chart.
              </div>
            ) : isLoadingEvaluations || isLoadingSelected ? (
              <div className="skill-map-chart-empty">Loading evaluation...</div>
            ) : !selectedEvalId ? (
              availableEvaluations.length === 0 ? (
                <div className="skill-map-chart-empty">No evaluations found.</div>
              ) : (
                <button
                  type="button"
                  className="skill-map-chart-empty skill-map-chart-empty--select"
                  onClick={openEvalModal}
                  aria-haspopup="dialog"
                  aria-expanded={evalModalOpen}
                >
                  Please choose an evaluation.
                </button>
              )
            ) : chartData.length === 0 ? (
              <div className="skill-map-chart-empty">No skills for this evaluation.</div>
            ) : (
              <div className="skill-map-radar-fixed-size">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={chartData}
                    margin={{ top: 14, right: 26, bottom: 14, left: 26 }}
                  >
                    <PolarGrid stroke="#ccc" />
                    <PolarAngleAxisComponent
                      dataKey="skill"
                      tick={{ fill: '#333', fontSize: 10 }}
                      tickLine={{ stroke: '#ccc' }}
                      tickFormatter={toRadarAxisLabel}
                    />
                    <PolarRadiusAxisComponent
                      angle={90}
                      domain={[0, radiusMax]}
                      tick={{ fill: '#666', fontSize: 9 }}
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
                    <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
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
                  {evaluation ? `${evaluation.title} (${toStatusLabel(evaluation.status)})` : '—'}
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

      {evaluation && (
        <section className="skill-map-rubric-session" aria-labelledby="skill-map-rubric-session-title">
          <div className="skill-map-rubric-session-head">
            <h2 id="skill-map-rubric-session-title" className="skill-map-title">
              Criteria Parsing Description by AI
              <span className="skill-map-rubric-session-title-name">
                {' '}
                - {evaluation.title}
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
                  <th scope="col" className="skill-map-rubric-th-level">AI level</th>
                  <th scope="col">Criteria parsing description</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.aiCriteriaParsingRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="skill-map-rubric-cell">
                      No AI criteria parsing descriptions for this evaluation.
                    </td>
                  </tr>
                ) : evaluation.aiCriteriaParsingRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <th scope="row" className="skill-map-rubric-row-skill">
                      {row.skillName || '—'}
                    </th>
                    <td className="skill-map-rubric-cell">{row.levelRank > 0 ? row.levelRank : '—'}</td>
                    <td className="skill-map-rubric-cell">{row.criteriaPassingDescription || '—'}</td>
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
                      aria-selected={pendingEvalId === String(ev.id)}
                      className={
                        pendingEvalId === String(ev.id)
                          ? 'skill-map-modal-item skill-map-modal-item-selected'
                          : 'skill-map-modal-item'
                      }
                      onClick={() => setPendingEvalId(String(ev.id))}
                    >
                      <span className="skill-map-modal-item-title">
                        {rubricTitleByHistoryId[ev.rubric_score_history_id] || `Evaluation #${ev.id}`} ({toStatusLabel(ev.status)})
                      </span>
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
                disabled={!pendingEvalId}
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
