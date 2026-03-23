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
        const hasHistorySnapshot =
          skillHistoryRes.data.length > 0 && levelHistoryRes.data.length > 0;

        if (hasHistorySnapshot) {
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
        } else {
          const [liveSkillsRes, liveLevelsRes] = await Promise.all([
            api.get<BackendRubricSkill[]>(`rubric/${rubricId}/rubric_skills`),
            api.get<BackendLevel[]>(`rubric/${rubricId}/levels`),
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

        const studentMap = scoreMapFromRows(full.student_evaluated_skills);
        const aiMap = scoreMapFromRows(full.ai_evaluated_skills);
        const teacherMap = scoreMapFromRows(full.teacher_evaluated_skills);

        const allSkillNames = new Set<string>();
        sortedSkills.forEach((s) => allSkillNames.add(s.name));
        Object.keys(studentMap).forEach((k) => allSkillNames.add(k));
        Object.keys(aiMap).forEach((k) => allSkillNames.add(k));
        Object.keys(teacherMap).forEach((k) => allSkillNames.add(k));

        const orderedNames = [
          ...sortedSkills.map((s) => s.name).filter((name) => allSkillNames.has(name)),
          ...Array.from(allSkillNames).filter((name) => !sortedSkills.some((s) => s.name === name)),
        ];

        setRubricDetail({
          id: String(rubricId),
          title: rubricTitle,
          headers,
          rows: orderedNames.map((skillArea) => ({ skillArea, values: [] })),
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
        student: row.student || 0,
        ai: row.ai || 0,
        teacher: row.teacher || 0,
      })),
    [mappedSkillSummary]
  );

  const maxLevel = useMemo(() => Math.max(1, rubricDetail?.headers.length || 1), [rubricDetail]);

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
                    <RadarChart data={radarData} margin={{ top: 10, right: 18, bottom: 0, left: 18 }}>
                      <PolarGridChart stroke="#ccc" />
                      <PolarAngleAxisChart
                        dataKey="skill"
                        tick={{ fill: '#333', fontSize: 12 }}
                        tickLine={{ stroke: '#ccc' }}
                      />
                      <PolarRadiusAxisChart
                        angle={90}
                        domain={[0, maxLevel]}
                        tick={{ fill: '#666', fontSize: 11 }}
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
