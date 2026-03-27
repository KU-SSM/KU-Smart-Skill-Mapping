import React, { useEffect, useMemo, useRef, useState } from 'react';
import './CertificateDetail.css';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import api from '../api/index';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const PolarGridChart = PolarGrid as unknown as React.ComponentType<any>;
const PolarAngleAxisChart = PolarAngleAxis as unknown as React.ComponentType<any>;
const PolarRadiusAxisChart = PolarRadiusAxis as unknown as React.ComponentType<any>;
const RadarChartShape = Radar as unknown as React.ComponentType<any>;
const TooltipChart = Tooltip as unknown as React.ComponentType<any>;

const PARTY_CONFIG = {
  student: { label: 'Student', stroke: '#3b82f6', fill: '#3b82f6' },
  ai: { label: 'AI', stroke: '#22c55e', fill: '#22c55e' },
  teacher: { label: 'Teacher', stroke: '#a855f7', fill: '#a855f7' },
} as const;

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

const toRadarSkillLabel = (skill: string): string => {
  const clean = skill.trim();
  if (clean.length <= 18) return clean;
  return `${clean.slice(0, 16)}...`;
};

interface SkillEvaluationFullResponse {
  id: number;
  rubric_score_history_id: number;
  portfolio_id: number;
  user_id: number;
  status: string;
  created_at?: string;
  ai_evaluated_skills: { skill_name: string; level_rank: number }[];
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

interface RubricDetailResponse {
  id: string;
  title: string;
  headers: string[];
  rows: { skillArea: string; values: string[] }[];
}

interface UserResponse {
  id: number;
  name?: string;
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

const CertificateDetail: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [evaluationFull, setEvaluationFull] = useState<SkillEvaluationFullResponse | null>(null);
  const [rubricDetail, setRubricDetail] = useState<RubricDetailResponse | null>(null);
  const [studentName, setStudentName] = useState<string>('Student');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    const loadCertificateData = async () => {
      if (!evaluationId) {
        setEvaluationFull(null);
        setRubricDetail(null);
        return;
      }
      try {
        setIsLoading(true);
        const evalId = Number(evaluationId);
        if (!Number.isInteger(evalId) || evalId <= 0) {
          throw new Error('Invalid evaluation id');
        }
        const fullRes = await api.get<SkillEvaluationFullResponse>(`skill_evaluation/${evalId}/full`);
        const full = fullRes.data;
        setEvaluationFull(full);

        const userRes = await api.get<UserResponse>(`user/${full.user_id}`);
        setStudentName(userRes.data.name || `Student #${full.user_id}`);

        const [historyRes, skillHistoryRes, levelHistoryRes] = await Promise.all([
          api.get<RubricHistoryResponse>(`rubric_score_history/${full.rubric_score_history_id}`),
          api.get<RubricSkillHistoryResponse[]>(
            `rubric_score_history/${full.rubric_score_history_id}/rubric_skills`
          ),
          api.get<LevelHistoryResponse[]>(`rubric_score_history/${full.rubric_score_history_id}/levels`),
        ]);

        const rubricId = historyRes.data.rubric_score_id;
        let rubricTitle = `Rubric #${rubricId}`;
        try {
          const rubricRes = await api.get<RubricResponse>(`rubric/${rubricId}`);
          rubricTitle = rubricRes.data.name || rubricTitle;
        } catch {
          // keep fallback title
        }

        let skills: { id: number; name: string; display_order?: number | null }[] = [];
        let levels: { id: number; rank?: number | null; description?: string | null }[] = [];
        let criteria: { rubric_skill_id: number; level_id: number; description: string }[] = [];
        const hasHistorySnapshot =
          skillHistoryRes.data.length > 0 && levelHistoryRes.data.length > 0;

        if (hasHistorySnapshot) {
          const criteriaHistoryRes = await api.get<CriteriaHistoryResponse[]>(
            `rubric_score_history/${full.rubric_score_history_id}/criteria`
          );
          skills = skillHistoryRes.data.map((s) => ({
            id: s.id,
            name: s.name || `Skill #${s.id}`,
            display_order: s.display_order ?? null,
          }));
          levels = levelHistoryRes.data.map((l) => ({
            id: l.id,
            rank: l.rank ?? null,
            description: l.description ?? '',
          }));
          criteria = criteriaHistoryRes.data.map((c) => ({
            rubric_skill_id: c.rubric_skill_history_id,
            level_id: c.level_history_id,
            description: (c.description || '').trim(),
          }));
        } else {
          const [liveSkillsRes, liveLevelsRes, liveCriteriaRes] = await Promise.all([
            api.get<BackendRubricSkill[]>(`rubric/${rubricId}/rubric_skills`),
            api.get<BackendLevel[]>(`rubric/${rubricId}/levels`),
            api.get<BackendCriteria[]>(`rubric/${rubricId}/criteria`),
          ]);
          skills = liveSkillsRes.data.map((s) => ({
            id: s.id,
            name: s.name || `Skill #${s.id}`,
            display_order: s.display_order ?? null,
          }));
          levels = liveLevelsRes.data.map((l) => ({
            id: l.id,
            rank: l.rank ?? null,
            description: l.description ?? '',
          }));
          criteria = liveCriteriaRes.data.map((c) => ({
            rubric_skill_id: c.rubric_skill_id,
            level_id: c.level_id,
            description: (c.description || '').trim(),
          }));
        }

        const sortedSkills = [...skills].sort(
          (a, b) =>
            (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER)
        );
        const sortedLevels = [...levels].sort(
          (a, b) =>
            (toPositiveInt(a.rank) || Number.MAX_SAFE_INTEGER) -
            (toPositiveInt(b.rank) || Number.MAX_SAFE_INTEGER)
        );

        const headers = sortedLevels.map((l, index) => {
          const desc = (l.description || '').trim();
          return desc || `Level ${index + 1}`;
        });
        const levelIndexById = new Map<number, number>();
        sortedLevels.forEach((level, idx) => {
          levelIndexById.set(level.id, idx);
        });

        // Keep certificate rows strictly aligned to the rubric snapshot skills.
        const orderedNames = sortedSkills.map((s) => s.name);

        setRubricDetail({
          id: String(rubricId),
          title: rubricTitle,
          headers,
          rows: orderedNames.map((skillArea) => {
            const skill = sortedSkills.find((s) => s.name === skillArea);
            const values = headers.map(() => '');
            if (skill) {
              criteria.forEach((criterion) => {
                if (criterion.rubric_skill_id !== skill.id) return;
                const levelIndex = levelIndexById.get(criterion.level_id);
                if (typeof levelIndex !== 'number' || levelIndex < 0) return;
                values[levelIndex] = criterion.description;
              });
            }
            return { skillArea, values };
          }),
        });
      } catch (error) {
        console.error('Failed to load certificate preview data:', error);
        setEvaluationFull(null);
        setRubricDetail(null);
      } finally {
        setIsLoading(false);
      }
    };
    void loadCertificateData();
  }, [evaluationId]);

  const mappedSkillSummary = useMemo(() => {
    if (!evaluationFull || !rubricDetail) return [];
    const studentMap = scoreMapFromRows(evaluationFull.student_evaluated_skills);
    const aiMap = scoreMapFromRows(evaluationFull.ai_evaluated_skills);
    const teacherMap = scoreMapFromRows(evaluationFull.teacher_evaluated_skills);
    return rubricDetail.rows.map((row) => ({
      skill: row.skillArea,
      student: studentMap[row.skillArea] || 0,
      ai: aiMap[row.skillArea] || 0,
      teacher: teacherMap[row.skillArea] || 0,
    }));
  }, [evaluationFull, rubricDetail]);

  const radarData = useMemo(
    () =>
      mappedSkillSummary.map((row) => ({
        skill: row.skill,
        skillLabel: toRadarSkillLabel(row.skill),
        student: row.student || 0,
        ai: row.ai || 0,
        teacher: row.teacher || 0,
      })),
    [mappedSkillSummary]
  );

  const maxLevel = useMemo(() => Math.max(1, rubricDetail?.headers.length || 1), [rubricDetail]);

  const rubricTableLayoutVars = useMemo(() => {
    const rowCount = rubricDetail?.rows.length || 0;
    const colCount = (rubricDetail?.headers.length || 0) + 1; // + skill area
    const complexity = rowCount * Math.max(colCount, 1);
    const safeRowBase = 5;
    const safeColBase = 6;
    const rowScale = rowCount > 0 ? Math.min(1, safeRowBase / rowCount) : 1;
    const colScale = colCount > 0 ? Math.min(1, safeColBase / colCount) : 1;
    const allCells = rubricDetail?.rows || [];
    const bodyTextChars = allCells.reduce(
      (sum, row) =>
        sum +
        row.values.reduce((inner, cell) => inner + (cell?.trim()?.length || 0), 0),
      0
    );
    const cellCount = Math.max(1, rowCount * Math.max(1, colCount - 1));
    const avgCharsPerCell = bodyTextChars / cellCount;
    const maxCharsPerCell = allCells.reduce((max, row) => {
      const rowMax = row.values.reduce(
        (innerMax, cell) => Math.max(innerMax, cell?.trim()?.length || 0),
        0
      );
      return Math.max(max, rowMax);
    }, 0);
    // Heuristic for very text-heavy rubrics.
    const densityFactor = Math.max(
      1,
      avgCharsPerCell / 45,
      maxCharsPerCell / 180
    );
    const densityScale = 1 / densityFactor;
    const tableScale = Math.max(0.08, Math.min(1, rowScale, colScale, densityScale));

    let fontSize = 10;
    let cellPadY = 6;
    let cellPadX = 8;
    let chartMinHeight = 470;
    let sectionTopMargin = 28;
    let lineHeight = 1.25;
    let firstColWidth = 24;

    if (complexity > 80) {
      fontSize = 9;
      cellPadY = 5;
      cellPadX = 7;
      chartMinHeight = 430;
      sectionTopMargin = 22;
      lineHeight = 1.2;
      firstColWidth = 22;
    }
    if (complexity > 130) {
      fontSize = 8;
      cellPadY = 4;
      cellPadX = 6;
      chartMinHeight = 390;
      sectionTopMargin = 16;
      lineHeight = 1.15;
      firstColWidth = 20;
    }
    if (complexity > 190) {
      fontSize = 7;
      cellPadY = 3;
      cellPadX = 5;
      chartMinHeight = 350;
      sectionTopMargin = 12;
      lineHeight = 1.1;
      firstColWidth = 18;
    }
    if (complexity > 260) {
      fontSize = 6;
      cellPadY = 2;
      cellPadX = 4;
      chartMinHeight = 300;
      sectionTopMargin = 10;
      lineHeight = 1.05;
      firstColWidth = 16;
    }

    return {
      ['--cert-rubric-font-size' as string]: `${fontSize}px`,
      ['--cert-rubric-cell-pad-y' as string]: `${cellPadY}px`,
      ['--cert-rubric-cell-pad-x' as string]: `${cellPadX}px`,
      ['--cert-radar-min-height' as string]: `${chartMinHeight}px`,
      ['--cert-rubric-section-margin-top' as string]: `${sectionTopMargin}px`,
      ['--cert-rubric-line-height' as string]: String(lineHeight),
      ['--cert-rubric-first-col-width' as string]: `${firstColWidth}%`,
      ['--cert-rubric-table-scale' as string]: String(tableScale),
    } as React.CSSProperties;
  }, [rubricDetail]);

  const handleExport = async () => {
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
      const filename = `Skill_Mapping_Certificate_${evaluationId || 'preview'}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting certificate preview:', error);
      alert('Failed to export certificate preview.');
    } finally {
      setIsExporting(false);
    }
  };

  const issuedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="certificate-detail-wrapper">
      <div className="certificate-section">
        <div className="certificate-template-preview" ref={previewRef}>
          <div className="certificate-template-header">
            <div className="certificate-template-title">KU Smart Skill Mapping</div>
            <div className="certificate-template-subtitle">Certificate of Skill Achievement</div>
          </div>
          <div className="certificate-template-body">
            <p className="certificate-award-text">This certifies that</p>
            <h2 className="certificate-student-name">{studentName}</h2>
            <p className="certificate-award-text">
              has completed skill mapping evaluation and demonstrated the following levels.
            </p>

            <div className="certificate-meta-grid">
              <div>
                <p className="certificate-rubric-line">
                  <span className="certificate-rubric-label">Rubric Score:</span>{' '}
                  <span className="certificate-rubric-value">{rubricDetail?.title || '-'}</span>
                </p>
              </div>
            </div>

            <div className="certificate-radar-section">
              <div className="certificate-radar-chart-box">
                {radarData.length === 0 ? (
                  <div className="certificate-radar-empty">No chart data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 6, right: 12, bottom: 4, left: 12 }}>
                      <PolarGridChart stroke="#ccc" />
                      <PolarAngleAxisChart
                        dataKey="skillLabel"
                        tick={{ fill: '#333', fontSize: 8 }}
                        tickLine={{ stroke: '#ccc' }}
                      />
                      <PolarRadiusAxisChart
                        angle={90}
                        domain={[0, maxLevel]}
                        tick={{ fill: '#666', fontSize: 8 }}
                        tickCount={Math.min(maxLevel + 1, 6)}
                      />
                      <RadarChartShape
                        name={PARTY_CONFIG.student.label}
                        dataKey="student"
                        stroke={PARTY_CONFIG.student.stroke}
                        fill={PARTY_CONFIG.student.fill}
                        fillOpacity={0.35}
                        strokeWidth={2}
                      />
                      <RadarChartShape
                        name={PARTY_CONFIG.ai.label}
                        dataKey="ai"
                        stroke={PARTY_CONFIG.ai.stroke}
                        fill={PARTY_CONFIG.ai.fill}
                        fillOpacity={0.35}
                        strokeWidth={2}
                      />
                      <RadarChartShape
                        name={PARTY_CONFIG.teacher.label}
                        dataKey="teacher"
                        stroke={PARTY_CONFIG.teacher.stroke}
                        fill={PARTY_CONFIG.teacher.fill}
                        fillOpacity={0.35}
                        strokeWidth={2}
                      />
                      <TooltipChart content={() => null} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="certificate-radar-legend" aria-hidden="true">
                <span className="certificate-radar-legend-item">
                  <span
                    className="certificate-radar-legend-dot"
                    style={{ backgroundColor: PARTY_CONFIG.ai.fill }}
                  />
                  {PARTY_CONFIG.ai.label}
                </span>
                <span className="certificate-radar-legend-item">
                  <span
                    className="certificate-radar-legend-dot"
                    style={{ backgroundColor: PARTY_CONFIG.student.fill }}
                  />
                  {PARTY_CONFIG.student.label}
                </span>
                <span className="certificate-radar-legend-item">
                  <span
                    className="certificate-radar-legend-dot"
                    style={{ backgroundColor: PARTY_CONFIG.teacher.fill }}
                  />
                  {PARTY_CONFIG.teacher.label}
                </span>
              </div>
              <div className="certificate-evaluation-rubric-section" style={rubricTableLayoutVars}>
                <div className="certificate-evaluation-rubric-table-wrap">
                  <div className="certificate-evaluation-rubric-table-inner">
                    <table className="certificate-evaluation-rubric-table">
                      <thead>
                        <tr>
                          <th>Skill Area</th>
                          {(rubricDetail?.headers || []).map((header, index) => (
                            <th key={`${header}-${index}`}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(rubricDetail?.rows || []).map((row) => (
                          <tr key={row.skillArea}>
                            <td>{row.skillArea}</td>
                            {(rubricDetail?.headers || []).map((_, levelIndex) => (
                              <td key={`${row.skillArea}-${levelIndex}`}>
                                {row.values[levelIndex]?.trim() || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="certificate-signature-block" aria-hidden="true">
                  <div className="certificate-signature-line" />
                  <div className="certificate-signature-label">Signature</div>
                </div>
              </div>
            </div>
          </div>
          <div className="certificate-template-footer">
            <div>
              <div className="certificate-footer-label">Issued date</div>
              <div>{issuedDate}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="message-section">
        <div className="certificate-detail-info">
          <h1>Certificate</h1>
          <p className="certificate-description">
            Preview your certificate template before export.
          </p>
          <div className="certificate-details">
            <div className="detail-item">
              <strong>Student Name:</strong> {studentName}
            </div>
            <div className="detail-item">
              <strong>Rubric Score:</strong> {rubricDetail?.title || '-'}
            </div>
            <div className="detail-item">
              <strong>Issued Date:</strong> {issuedDate}
            </div>
          </div>
        </div>
        <div className="certificate-detail-buttons">
          <button
            onClick={() => navigate('/certificate')}
            className="back-button"
            type="button"
          >
            Back
          </button>
          <button
            onClick={handleExport}
            className="export-button"
            disabled={isLoading || !evaluationId || isExporting || !evaluationFull}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificateDetail;
