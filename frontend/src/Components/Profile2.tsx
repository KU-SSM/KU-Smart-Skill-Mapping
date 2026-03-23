import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import './Profile.css';
import './RubricScore.css';
import { AiOutlineClose, AiOutlineDelete, AiOutlineInfoCircle, AiOutlinePlus } from 'react-icons/ai';
import { FaBriefcase } from 'react-icons/fa';
import { evaluatePortfolio, importPortfolio } from '../services/portfolioApi';
import { getRubricScores, getRubricScore, RubricScoreDetail } from '../services/rubricScoreApi';
import {
  deleteSkillEvaluation,
  updateSkillEvaluation,
} from '../services/skillEvaluationApi';
import RubricScoreTable from './RubricScoreTable';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/index';
import { useAppRole } from '../context/AppRoleContext';
import { getCurrentUserId, setCurrentUserId } from '../utils/currentUser';
import { getApiErrorDetail } from '../utils/apiErrors';

const CloseIcon = AiOutlineClose as React.ComponentType;
const BriefcaseIcon = FaBriefcase as React.ComponentType;
const InfoIcon = AiOutlineInfoCircle as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;
const DeleteOutlineIcon = AiOutlineDelete as React.ComponentType;

interface Skill {
  skillArea: string;
}

interface TableData {
  skillArea: string;
  values: string[];
}

interface EvaluationMaps {
  ai: { [skillArea: string]: string };
  student: { [skillArea: string]: string };
  teacher: { [skillArea: string]: string };
}

interface FormerRubricVersion {
  version: string;
  createdAt: string;
  expiresAt: string;
  title: string;
  headers: string[];
  rows: TableData[];
  evaluations: EvaluationMaps;
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

interface BackendEvaluatedSkillRow {
  skill_name: string;
  level_rank: number;
}

interface StudentEvaluatedSkillApiRow {
  id: number;
  skill_evaluation_id: number;
  skill_name: string;
  level_rank: number;
}

interface SkillEvaluationFullResponse {
  id: number;
  rubric_score_history_id: number;
  portfolio_id: number;
  user_id: number;
  status: string;
  ai_evaluated_skills: BackendEvaluatedSkillRow[];
  student_evaluated_skills: BackendEvaluatedSkillRow[];
  teacher_evaluated_skills: BackendEvaluatedSkillRow[];
}

interface RubricScoreHistoryResponse {
  id: number;
  rubric_score_id: number;
}

interface TeacherEvaluatedSkillApiRow {
  id: number;
  skill_evaluation_id: number;
  skill_name: string;
  level_rank: number;
}

interface RubricSkillAiEvaluationItem {
  rubric_skill_id?: number;
  level_id?: number;
  skill_name?: string;
  level_rank?: number;
}

interface EvaluationDisplayMeta {
  rubricId: string;
  rubricTitle: string;
  portfolioFileName: string;
}

const evaluationMetaKey = (evaluationId: string) => `evaluation_display_meta_${evaluationId}`;

const readEvaluationMeta = (evaluationId: string): EvaluationDisplayMeta | null => {
  try {
    const raw = localStorage.getItem(evaluationMetaKey(evaluationId));
    if (!raw) return null;
    return JSON.parse(raw) as EvaluationDisplayMeta;
  } catch {
    return null;
  }
};

const writeEvaluationMeta = (evaluationId: string, meta: EvaluationDisplayMeta): void => {
  try {
    localStorage.setItem(evaluationMetaKey(evaluationId), JSON.stringify(meta));
  } catch {
    // ignore localStorage errors
  }
};

const removeEvaluationMeta = (evaluationId: string): void => {
  try {
    localStorage.removeItem(evaluationMetaKey(evaluationId));
  } catch {
    // ignore localStorage errors
  }
};

const Profile2: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isStudent, isTeacher } = useAppRole();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Rubric Score section state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<{ id: string; title: string }[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [confirmedRubricId, setConfirmedRubricId] = useState<string | null>(null);
  const [selectedRubricData, setSelectedRubricData] = useState<RubricScoreDetail | null>(null);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState<boolean>(true);
  const [isLoadingRubricData, setIsLoadingRubricData] = useState<boolean>(false);
  const [isRubricInfoOpen, setIsRubricInfoOpen] = useState<boolean>(false);
  const [rubricInfoData, setRubricInfoData] = useState<RubricScoreDetail | null>(null);
  const [isRubricInfoLoading, setIsRubricInfoLoading] = useState<boolean>(false);
  const [rubricInfoError, setRubricInfoError] = useState<string | null>(null);

  // Mock: rubric history (restore/expiration UI only; no backend).
  const historySeedRubricIdRef = useRef<string | null>(null);
  const [isRubricHistoryOpen, setIsRubricHistoryOpen] = useState<boolean>(false);
  const [formerRubricVersions, setFormerRubricVersions] = useState<FormerRubricVersion[]>([]);
  const [selectedFormerVersion, setSelectedFormerVersion] = useState<FormerRubricVersion | null>(null);

  // Skills selection for evaluation results - 3 separate lists
  const [aiSkills, setAiSkills] = useState<Skill[]>([]);
  const [studentSkills, setStudentSkills] = useState<Skill[]>([]);
  const [studentExtraSkills, setStudentExtraSkills] = useState<Skill[]>([]);
  const [teacherSkills, setTeacherSkills] = useState<Skill[]>([]);
  const [searchAi, setSearchAi] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [searchTeacher, setSearchTeacher] = useState<string>('');

  // Evaluation scores state - using skill area names as keys
  const [teacherEvaluations, setTeacherEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [aiEvaluations, setAiEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [studentEvaluations, setStudentEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [originalStudentSkills, setOriginalStudentSkills] = useState<Skill[]>([]);
  const [originalStudentExtraSkills, setOriginalStudentExtraSkills] = useState<Skill[]>([]);
  const [originalStudentEvaluations, setOriginalStudentEvaluations] = useState<{ [skillArea: string]: string }>({});
  /** Baseline AI scores when student entered edit mode (for cancel / done without save). */
  const [originalAiEvaluations, setOriginalAiEvaluations] = useState<{ [skillArea: string]: string }>({});
  /** Student: AI run results before Save (committed to aiEvaluations on Save only). */
  const [draftAiEvaluations, setDraftAiEvaluations] = useState<{ [skillArea: string]: string } | null>(null);
  const [extractedPortfolioText, setExtractedPortfolioText] = useState<string>('');
  const [isAiEvaluating, setIsAiEvaluating] = useState<boolean>(false);
  const [savedSkillEvaluationId, setSavedSkillEvaluationId] = useState<number | null>(null);
  const [skillEvaluationStatus, setSkillEvaluationStatus] = useState<string>('draft');
  const [isSavingEvaluation, setIsSavingEvaluation] = useState<boolean>(false);
  const [portfolioDisplayName, setPortfolioDisplayName] = useState<string>('');
  const [originalPortfolioDisplayName, setOriginalPortfolioDisplayName] = useState<string>('');
  const [originalConfirmedRubricId, setOriginalConfirmedRubricId] = useState<string | null>(null);
  const [pendingHydratedScores, setPendingHydratedScores] = useState<EvaluationMaps | null>(null);
  const [hasAppliedHydratedScores, setHasAppliedHydratedScores] = useState<boolean>(false);
  const hasTeacherSubmittedScores = useMemo(
    () =>
      Object.values(teacherEvaluations).some(
        (value) =>
          typeof value === 'string' &&
          /^\d+$/.test(value.trim()) &&
          Number(value.trim()) > 0
      ),
    [teacherEvaluations]
  );
  const isStudentEvaluationLocked =
    isStudent &&
    (skillEvaluationStatus === 'pending' ||
      skillEvaluationStatus === 'completed' ||
      skillEvaluationStatus === 'approved');
  const isStudentEvaluationCompleted =
    isStudent &&
    (skillEvaluationStatus === 'completed' ||
      skillEvaluationStatus === 'approved');
  const shouldShowTeacherPanel =
    !isStudent || skillEvaluationStatus === 'completed' || skillEvaluationStatus === 'approved';
  const evaluationPanelsGridClass = shouldShowTeacherPanel
    ? 'profile2-three-panels'
    : 'profile2-two-panels';

  useEffect(() => {
    const parsedId = Number(evaluationId);
    if (Number.isInteger(parsedId) && parsedId > 0) {
      setSavedSkillEvaluationId(parsedId);
    } else {
      setSavedSkillEvaluationId(null);
      setSkillEvaluationStatus('draft');
      setOriginalPortfolioDisplayName('');
      setOriginalConfirmedRubricId(null);
      setHasAppliedHydratedScores(false);
    }
  }, [evaluationId]);

  useEffect(() => {
    const parsedId = Number(evaluationId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setPendingHydratedScores(null);
      return;
    }

    const toScoreMap = (rows: BackendEvaluatedSkillRow[]) => {
      const out: { [skillArea: string]: string } = {};
      rows.forEach((row) => {
        if (!row.skill_name) return;
        out[row.skill_name] = String(row.level_rank ?? '');
      });
      return out;
    };

    const loadSavedEvaluation = async () => {
      try {
        const se = await api.get<SkillEvaluationFullResponse>(`skill_evaluation/${parsedId}/full`);
        const rh = await api.get<RubricScoreHistoryResponse>(
          `rubric_score_history/${se.data.rubric_score_history_id}`
        );
        const [studentRowsRes, teacherRowsRes] = await Promise.all([
          api.get<StudentEvaluatedSkillApiRow[]>(
            `skill_evaluation/${parsedId}/student_evaluated_skills`
          ),
          api.get<TeacherEvaluatedSkillApiRow[]>(
            `skill_evaluation/${parsedId}/teacher_evaluated_skills`
          ),
        ]);
        const rubricId = String(rh.data.rubric_score_id);
        setSelectedRubricId(rubricId);
        setConfirmedRubricId(rubricId);
        setOriginalConfirmedRubricId(rubricId);
        setHasAppliedHydratedScores(false);
        setSavedSkillEvaluationId(se.data.id);
        setSkillEvaluationStatus(se.data.status || 'draft');
        const savedMeta = readEvaluationMeta(String(se.data.id));
        const resolvedPortfolioName =
          savedMeta?.portfolioFileName || `Portfolio #${se.data.portfolio_id}`;
        setPortfolioDisplayName(resolvedPortfolioName);
        setOriginalPortfolioDisplayName(resolvedPortfolioName);
        setPendingHydratedScores({
          ai: toScoreMap(se.data.ai_evaluated_skills || []),
          student: toScoreMap(studentRowsRes.data || se.data.student_evaluated_skills || []),
          teacher: toScoreMap(teacherRowsRes.data || se.data.teacher_evaluated_skills || []),
        });
      } catch (error) {
        console.error('Failed to hydrate saved evaluation:', error);
      }
    };

    void loadSavedEvaluation();
  }, [evaluationId]);

  const resolveValidUserId = useCallback(async (): Promise<number> => {
    const checkUserExists = async (id: number): Promise<boolean> => {
      try {
        await api.get(`user/${id}`);
        return true;
      } catch (error: any) {
        if (error?.response?.status === 404) return false;
        throw error;
      }
    };

    const createGuestUser = async (): Promise<number> => {
      const nowIso = new Date().toISOString();
      const stamp = Date.now();
      const res = await api.post('user/', {
        name: `Guest Student ${stamp}`,
        email: `guest.student.${stamp}@local.dev`,
        password: 'guest',
        role: 'student',
        created_at: nowIso,
        updated_at: nowIso,
      });
      const createdId = Number(res.data?.id);
      if (!Number.isInteger(createdId) || createdId <= 0) {
        throw new Error('Failed to create a guest user for evaluation.');
      }
      return createdId;
    };

    const preferred = getCurrentUserId();
    if (await checkUserExists(preferred)) return preferred;

    for (let candidate = 1; candidate <= 50; candidate += 1) {
      if (candidate === preferred) continue;
      if (await checkUserExists(candidate)) {
        setCurrentUserId(candidate);
        return candidate;
      }
    }

    const guestId = await createGuestUser();
    setCurrentUserId(guestId);
    return guestId;
  }, []);

  // Load rubric scores on mount
  useEffect(() => {
    const loadRubricScores = async () => {
      try {
        setIsLoadingRubrics(true);
        const scores = await getRubricScores();
        setRubricScores(scores);
      } catch (error) {
        console.error('Error loading rubric scores:', error);
        setRubricScores([]);
      } finally {
        setIsLoadingRubrics(false);
      }
    };

    loadRubricScores();
  }, []);

  // Load confirmed rubric data (only after user confirms selection)
  useEffect(() => {
    const loadRubricData = async () => {
      if (!confirmedRubricId) {
        setSelectedRubricData(null);
        return;
      }

      try {
        setIsLoadingRubricData(true);
        const rubricData = await getRubricScore(confirmedRubricId);
        setSelectedRubricData(rubricData);
        
        // Initialize skills from rubric rows - all panels show the same skills
        const skillsFromRubric: Skill[] = rubricData.rows.map(row => ({
          skillArea: row.skillArea
        }));
        // All three panels show the same skill areas
        setAiSkills(skillsFromRubric);
        setStudentSkills(skillsFromRubric);
        setStudentExtraSkills([]);
        setTeacherSkills(skillsFromRubric);
        
        // Initialize evaluations (AI and Teacher are blank until evaluated)
        const newTeacherValues: { [skillArea: string]: string } = {};
        const newAiValues: { [skillArea: string]: string } = {};
        const newStudentValues: { [skillArea: string]: string } = {};
        
        // Use skill areas from rows
        rubricData.rows.forEach((row) => {
          const skillArea = row.skillArea;
          newTeacherValues[skillArea] = '';
          newAiValues[skillArea] = ''; // Set by backend AI evaluation after portfolio+rubric are selected
          newStudentValues[skillArea] = '';
        });
        
        if (pendingHydratedScores) {
          const baseSkillSet = new Set(skillsFromRubric.map((s) => s.skillArea));
          const extraStudentSkills = Object.keys(pendingHydratedScores.student)
            .filter((skillArea) => !baseSkillSet.has(skillArea))
            .map((skillArea) => ({ skillArea }));

          setStudentExtraSkills(extraStudentSkills);
          setTeacherEvaluations({ ...newTeacherValues, ...pendingHydratedScores.teacher });
          setAiEvaluations({ ...newAiValues, ...pendingHydratedScores.ai });
          setStudentEvaluations({ ...newStudentValues, ...pendingHydratedScores.student });
          setOriginalStudentSkills(skillsFromRubric.map((s) => ({ ...s })));
          setOriginalStudentExtraSkills(extraStudentSkills.map((s) => ({ ...s })));
          setOriginalStudentEvaluations({
            ...newStudentValues,
            ...pendingHydratedScores.student,
          });
          setOriginalAiEvaluations({ ...newAiValues, ...pendingHydratedScores.ai });
          setHasAppliedHydratedScores(true);
          setPendingHydratedScores(null);
        } else if (!hasAppliedHydratedScores) {
          setTeacherEvaluations(newTeacherValues);
          setAiEvaluations(newAiValues);
          setStudentEvaluations(newStudentValues);
          setOriginalStudentSkills(skillsFromRubric.map((s) => ({ ...s })));
          setOriginalStudentExtraSkills([]);
          setOriginalStudentEvaluations({ ...newStudentValues });
          setOriginalAiEvaluations({ ...newAiValues });
        }
        setDraftAiEvaluations(null);
      } catch (error: any) {
        console.error('Error loading rubric data:', error);
        // Only set to null if it's a critical error (like rubric not found or network failure)
        if (error?.message?.includes('Failed to fetch rubric score') || 
            error?.response?.status === 404 ||
            error?.code === 'ERR_NETWORK') {
          setSelectedRubricData(null);
        } else {
          // For other errors, try to continue with partial data or empty structure
          console.warn('Continuing with partial rubric data due to:', error?.message);
          // Set empty rubric structure so UI can show appropriate message
          setSelectedRubricData({
            id: confirmedRubricId || '',
            title: 'Unknown Rubric',
            headers: [],
            rows: [],
          });
        }
      } finally {
        setIsLoadingRubricData(false);
      }
    };

    loadRubricData();
  }, [confirmedRubricId, pendingHydratedScores, hasAppliedHydratedScores]);

  /** Manual AI evaluation — avoids surprise API calls and re-runs on every state tick. */
  const runAiEvaluation = useCallback(async () => {
    if (!confirmedRubricId || !selectedRubricData || !extractedPortfolioText.trim()) return;
    // Only students use this (teachers have no Evaluate with AI button).
    if (!isStudent) return;
    if (isStudentEvaluationLocked) return;

    try {
      setIsAiEvaluating(true);
      const resolvedUserId = await resolveValidUserId();

      const [skillsRes, levelsRes, evalRes] = await Promise.all([
        api.get<BackendRubricSkill[]>(`rubric/${confirmedRubricId}/rubric_skills`),
        api.get<BackendLevel[]>(`rubric/${confirmedRubricId}/levels`),
        evaluatePortfolio(
          extractedPortfolioText,
          confirmedRubricId,
          uploadedFiles[0]?.name || 'portfolio.pdf',
          resolvedUserId,
          savedSkillEvaluationId ?? undefined
        ),
      ]);

      const sortedSkills = [...skillsRes.data].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      );
      // Map rubric_skill_id -> row.skillArea (UI key). Rows match sorted skills by position.
      const rubricSkillIdToRowKey = new Map<number, string>();
      sortedSkills.forEach((s, i) => {
        const rowKey = selectedRubricData.rows[i]?.skillArea ?? s.name;
        rubricSkillIdToRowKey.set(s.id, rowKey);
      });
      const levelIdToRank = new Map<number, number>(
        levelsRes.data.map((l) => [l.id, l.rank])
      );
      const normalizeSkillKey = (value: string) => value.trim().toLowerCase();
      const rubricSkillNameToRowKey = new Map<string, string>();
      sortedSkills.forEach((s, i) => {
        const rowKey = selectedRubricData.rows[i]?.skillArea ?? s.name;
        rubricSkillNameToRowKey.set(normalizeSkillKey(s.name), rowKey);
      });
      const directRowKeySet = new Set(
        selectedRubricData.rows.map((row) => normalizeSkillKey(row.skillArea))
      );

      const nextAiEvaluations: { [skillArea: string]: string } = {};
      selectedRubricData.rows.forEach((row) => {
        nextAiEvaluations[row.skillArea] = '';
      });

      (evalRes.evaluations as RubricSkillAiEvaluationItem[]).forEach((item) => {
        let rowKey: string | undefined;
        let levelRank: number | undefined;

        // Legacy API shape: rubric_skill_id + level_id
        if (typeof item.rubric_skill_id === 'number') {
          rowKey = rubricSkillIdToRowKey.get(item.rubric_skill_id);
        }
        if (typeof item.level_id === 'number') {
          levelRank = levelIdToRank.get(item.level_id);
        }

        // Current API shape: skill_name + level_rank
        if (!rowKey && typeof item.skill_name === 'string' && item.skill_name.trim() !== '') {
          const normalizedSkill = normalizeSkillKey(item.skill_name);
          if (directRowKeySet.has(normalizedSkill)) {
            rowKey = selectedRubricData.rows.find(
              (row) => normalizeSkillKey(row.skillArea) === normalizedSkill
            )?.skillArea;
          } else {
            rowKey = rubricSkillNameToRowKey.get(normalizedSkill);
          }
        }
        if (
          (levelRank === undefined || Number.isNaN(levelRank)) &&
          typeof item.level_rank === 'number'
        ) {
          levelRank = item.level_rank;
        }

        if (!rowKey || !levelRank || levelRank <= 0) return;
        nextAiEvaluations[rowKey] = String(levelRank);
      });

      if (
        typeof evalRes.skill_evaluation_id === 'number' &&
        Number.isInteger(evalRes.skill_evaluation_id) &&
        evalRes.skill_evaluation_id > 0
      ) {
        setSavedSkillEvaluationId(evalRes.skill_evaluation_id);
      }
      setDraftAiEvaluations(nextAiEvaluations);
    } catch (error: any) {
      console.error('AI evaluation failed:', error);
    } finally {
      setIsAiEvaluating(false);
    }
  }, [
    confirmedRubricId,
    selectedRubricData,
    extractedPortfolioText,
    uploadedFiles,
    isStudent,
    isStudentEvaluationLocked,
    savedSkillEvaluationId,
    resolveValidUserId,
  ]);

  const canRunAiEvaluation =
    !!confirmedRubricId &&
    !!selectedRubricData &&
    extractedPortfolioText.trim().length > 0 &&
    !isAiEvaluating &&
    !isStudentEvaluationLocked;

  // If user restores from the rubric-version detail page, apply its payload (mock) after rubric data loads.
  useEffect(() => {
    const state = (location.state || {}) as any;
    const payload = state?.restorePayload;
    if (!payload) return;
    if (isLoadingRubricData) return;

    const rubricDetail = payload.rubricDetail as RubricScoreDetail;
    const evaluations = payload.evaluations as EvaluationMaps;
    if (!rubricDetail || !evaluations) return;

    const restoredSkills: Skill[] = (rubricDetail.rows || []).map((row) => ({ skillArea: row.skillArea }));

    setSelectedRubricData(rubricDetail);
    setAiSkills(restoredSkills);
    setStudentSkills(restoredSkills);
    setStudentExtraSkills([]);
    setTeacherSkills(restoredSkills);
    setAiEvaluations({ ...evaluations.ai });
    setStudentEvaluations({ ...evaluations.student });
    setTeacherEvaluations({ ...evaluations.teacher });
    setOriginalStudentSkills(restoredSkills.map((s) => ({ ...s })));
    setOriginalStudentExtraSkills([]);
    setOriginalStudentEvaluations({ ...evaluations.student });
    setOriginalAiEvaluations({ ...evaluations.ai });
    setDraftAiEvaluations(null);
    setSelectedFormerVersion(null);
    setIsRubricHistoryOpen(false);

    // Clear payload so it doesn't re-apply on re-renders.
    navigate(`/profile2/${evaluationId || '1'}`, { replace: true, state: {} });
  }, [location.state, isLoadingRubricData, navigate, evaluationId]);

  // Seed mock history versions once per rubric confirmation.
  useEffect(() => {
    if (!confirmedRubricId || !selectedRubricData) return;
    if (historySeedRubricIdRef.current === confirmedRubricId) return;
    historySeedRubricIdRef.current = confirmedRubricId;

    const now = new Date();
    const iso = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

    const fullHeaders = selectedRubricData.headers;
    const trimmedHeaders =
      fullHeaders.length > 1 ? fullHeaders.slice(0, fullHeaders.length - 1) : fullHeaders;

    const buildRows = (headersToUse: string[]): TableData[] =>
      selectedRubricData.rows.map((r) => ({
        skillArea: r.skillArea,
        values: r.values.slice(0, headersToUse.length),
      }));

    const buildEvaluations = (headersToUse: string[]): EvaluationMaps => {
      const maxLevel = Math.max(1, Math.min(5, headersToUse.length));
      const generateRandomLevel = () => String(Math.floor(Math.random() * maxLevel) + 1);

      const ai: { [skillArea: string]: string } = {};
      const teacher: { [skillArea: string]: string } = {};
      const student: { [skillArea: string]: string } = {};

      selectedRubricData.rows.forEach((r) => {
        ai[r.skillArea] = generateRandomLevel();
        teacher[r.skillArea] = generateRandomLevel();
        student[r.skillArea] = '';
      });

      return { ai, teacher, student };
    };

    const exp1 = new Date(now);
    exp1.setDate(exp1.getDate() + 2);
    exp1.setHours(23, 59, 59, 0);

    const exp2 = new Date(now);
    exp2.setDate(exp2.getDate() + 10);
    exp2.setHours(23, 59, 59, 0);

    const v1: FormerRubricVersion = {
      version: 'v1',
      title: `${selectedRubricData.title} (v1)`,
      createdAt: '2026-02-28 10:27:23',
      expiresAt: '2026-03-22 16:59:59',
      headers: trimmedHeaders,
      rows: buildRows(trimmedHeaders),
      evaluations: buildEvaluations(trimmedHeaders),
    };

    const v2: FormerRubricVersion = {
      version: 'v2',
      title: `${selectedRubricData.title} (v2)`,
      createdAt: iso(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
      expiresAt: iso(exp2),
      headers: fullHeaders,
      rows: buildRows(fullHeaders),
      evaluations: buildEvaluations(fullHeaders),
    };

    setFormerRubricVersions([v1, v2]);
    setSelectedFormerVersion(null);
    setIsRubricHistoryOpen(false);
  }, [confirmedRubricId, selectedRubricData]);

  const handleUploadClick = () => {
    if (isStudentEvaluationLocked) return;
    fileInputRef.current?.click();
  };

  const clearPortfolioFile = useCallback(() => {
    setUploadedFiles([]);
    setPortfolioDisplayName('');
    setExtractedPortfolioText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setAiEvaluations((prev) => {
      const cleared: { [skillArea: string]: string } = {};
      Object.keys(prev).forEach((k) => {
        cleared[k] = '';
      });
      return cleared;
    });
    setDraftAiEvaluations(null);
  }, []);

  const handleRemoveUploadedFile = () => {
    if (isStudentEvaluationLocked) return;
    if (!uploadedFiles.length) return;
    if (!window.confirm('Remove the uploaded portfolio file?')) return;
    clearPortfolioFile();
  };

  const handleDeleteEvaluation = () => {
    if (isStudentEvaluationLocked) return;
    if (!evaluationId) {
      navigate('/profile2');
      return;
    }
    if (
      !window.confirm(
        'Delete this evaluation? This will remove it from your list and discard unsaved work on this page.'
      )
    ) {
      return;
    }
    const parsedId = Number(evaluationId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      navigate('/profile2', { state: { refreshAt: Date.now() } });
      return;
    }
    void (async () => {
      try {
        await deleteSkillEvaluation(parsedId);
        removeEvaluationMeta(String(parsedId));
        navigate('/profile2', { state: { removeEvaluationId: String(parsedId), refreshAt: Date.now() } });
      } catch (error) {
        console.error('Failed to delete evaluation from backend:', error);
        alert(`Failed to delete evaluation: ${getApiErrorDetail(error)}`);
      }
    })();
  };

  const persistStudentEvaluations = useCallback(
    async (skillEvaluationId: number) => {
      const existing = await api.get<StudentEvaluatedSkillApiRow[]>(
        `skill_evaluation/${skillEvaluationId}/student_evaluated_skills`
      );

      await Promise.all(
        existing.data.map((row) => api.delete(`student_evaluated_skill/${row.id}`))
      );

      const payloads = Object.entries(studentEvaluations)
        .map(([skillArea, score]) => ({ skillArea: skillArea.trim(), score: score.trim() }))
        .filter(
          ({ skillArea, score }) =>
            skillArea !== '' && /^\d+$/.test(score) && Number(score) > 0
        );

      await Promise.all(
        payloads.map(({ skillArea, score }) =>
          api.post('student_evaluated_skill/', {
            skill_evaluation_id: skillEvaluationId,
            skill_name: skillArea,
            level_rank: Number(score),
          })
        )
      );
    },
    [studentEvaluations]
  );

  const handleSaveEvaluationToBackend = useCallback(async () => {
    if (!confirmedRubricId) return;
    try {
      setIsSavingEvaluation(true);
      let skillEvaluationIdToSave = savedSkillEvaluationId;

      // Initial create path: allow Save to create an evaluation record even when student scores are blank.
      if (!(typeof skillEvaluationIdToSave === 'number' && skillEvaluationIdToSave > 0)) {
        if (!extractedPortfolioText.trim()) {
          alert('Please upload and import a portfolio first.');
          return;
        }
        const resolvedUserId = await resolveValidUserId();
        const evalRes = await evaluatePortfolio(
          extractedPortfolioText,
          confirmedRubricId,
          uploadedFiles[0]?.name || portfolioDisplayName || 'portfolio.pdf',
          resolvedUserId
        );
        if (
          typeof evalRes.skill_evaluation_id === 'number' &&
          Number.isInteger(evalRes.skill_evaluation_id) &&
          evalRes.skill_evaluation_id > 0
        ) {
          skillEvaluationIdToSave = evalRes.skill_evaluation_id;
          setSavedSkillEvaluationId(evalRes.skill_evaluation_id);
        }
      }

      if (typeof skillEvaluationIdToSave === 'number' && skillEvaluationIdToSave > 0) {
        const committedAiEvaluations = draftAiEvaluations
          ? { ...draftAiEvaluations }
          : { ...aiEvaluations };

        await persistStudentEvaluations(skillEvaluationIdToSave);
        setAiEvaluations(committedAiEvaluations);
        writeEvaluationMeta(String(skillEvaluationIdToSave), {
          rubricId: confirmedRubricId,
          rubricTitle: selectedRubricData?.title || '',
          portfolioFileName: uploadedFiles[0]?.name || portfolioDisplayName || 'portfolio.pdf',
        });
        setOriginalStudentSkills(studentSkills.map((s) => ({ ...s })));
        setOriginalStudentExtraSkills(studentExtraSkills.map((s) => ({ ...s })));
        setOriginalStudentEvaluations({ ...studentEvaluations });
        setOriginalAiEvaluations(committedAiEvaluations);
        setOriginalPortfolioDisplayName(uploadedFiles[0]?.name || portfolioDisplayName || '');
        setOriginalConfirmedRubricId(confirmedRubricId);
        setDraftAiEvaluations(null);
        // Stay on this detail page after Save; for first-time create, switch URL to the new id.
        if (String(evaluationId || '') !== String(skillEvaluationIdToSave)) {
          navigate(`/profile2/${skillEvaluationIdToSave}`, { replace: true });
        }
      } else {
        console.warn('Evaluation saved but no skill_evaluation_id returned.');
      }
    } catch (error) {
      console.error('Failed to save evaluation to backend:', error);
      alert(`Failed to save evaluation to backend: ${getApiErrorDetail(error)}`);
    } finally {
      setIsSavingEvaluation(false);
    }
  }, [
    confirmedRubricId,
    uploadedFiles,
    portfolioDisplayName,
    extractedPortfolioText,
    selectedRubricData,
    savedSkillEvaluationId,
    persistStudentEvaluations,
    studentSkills,
    studentExtraSkills,
    studentEvaluations,
    aiEvaluations,
    draftAiEvaluations,
    resolveValidUserId,
    evaluationId,
    navigate,
  ]);

  const handleRequestTeacherEvaluation = async () => {
    if (isStudentEvaluationLocked) return;
    const evaluationId = savedSkillEvaluationId;
    if (!(typeof evaluationId === 'number' && evaluationId > 0)) {
      alert('Please save this evaluation before requesting teacher evaluation.');
      return;
    }

    if (hasUnsavedEvaluationChanges) {
      alert('Please save evaluation changes before requesting teacher evaluation.');
      return;
    }

    try {
      await updateSkillEvaluation(evaluationId, { status: 'pending' });
      setSkillEvaluationStatus('pending');
      alert('Teacher evaluation requested. Status is now pending.');
    } catch (error) {
      console.error('Failed to request teacher evaluation:', error);
      alert(`Failed to request teacher evaluation: ${getApiErrorDetail(error)}`);
    }
  };

  const handleCancelPendingRequest = async () => {
    if (skillEvaluationStatus !== 'pending') return;
    if (hasTeacherSubmittedScores) {
      alert('Cannot cancel request because teacher has already submitted scores.');
      return;
    }
    const evaluationId = savedSkillEvaluationId;
    if (!(typeof evaluationId === 'number' && evaluationId > 0)) return;
    try {
      await updateSkillEvaluation(evaluationId, { status: 'draft' });
      setSkillEvaluationStatus('draft');
      alert('Request cancelled. Evaluation is back to drafted.');
      navigate('/profile2', {
        state: { addedSkillEvaluationId: String(evaluationId), refreshAt: Date.now() },
      });
    } catch (error) {
      console.error('Failed to cancel pending request:', error);
      alert(`Failed to cancel request: ${getApiErrorDetail(error)}`);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isStudentEvaluationLocked) {
      event.target.value = '';
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    // Accept only PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      console.warn('Please upload PDF files only. The backend only accepts PDF format.');
      event.target.value = '';
      return;
    }

    // Enforce 10MB max (10 * 1024 * 1024 bytes)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      console.warn('File is too large. Maximum size is 10MB.');
      event.target.value = '';
      return;
    }

    // Store only a single selected file
    setUploadedFiles([file]);
    setPortfolioDisplayName(file.name);
    
    try {
      const result = await importPortfolio(
        'portfolio-general',
        'General Portfolio',
        [file]
      );
      console.log('Portfolio import successful:', result);
      setExtractedPortfolioText(result.text || '');
      // New portfolio text invalidates previous AI scores until user runs evaluation again.
      setAiEvaluations((prev) => {
        const cleared: { [skillArea: string]: string } = {};
        Object.keys(prev).forEach((k) => {
          cleared[k] = '';
        });
        return cleared;
      });
      setDraftAiEvaluations(null);
    } catch (error: any) {
      console.error('Error importing portfolio:', error);
      setExtractedPortfolioText('');
    }
  };

  const filteredRubricScores = useMemo(() => {
    if (!searchQuery.trim()) {
      return rubricScores;
    }
    const query = searchQuery.toLowerCase();
    return rubricScores.filter(rubric =>
      rubric.title.toLowerCase().includes(query)
    );
  }, [rubricScores, searchQuery]);

  const handleRubricSelect = (rubricId: string) => {
    if (isStudentEvaluationLocked) return;
    setSelectedRubricId(rubricId);
  };

  const handleConfirmRubric = () => {
    if (isStudentEvaluationLocked) return;
    if (!selectedRubricId) {
      return;
    }
    setConfirmedRubricId(selectedRubricId);
    console.log('Confirmed rubric selection:', selectedRubricId);
  };

  const handleOpenRubricInfo = async (e: React.MouseEvent, rubricId: string) => {
    e.stopPropagation();
    setIsRubricInfoOpen(true);
    setIsRubricInfoLoading(true);
    setRubricInfoError(null);
    try {
      const data = await getRubricScore(rubricId);
      setRubricInfoData(data);
    } catch (error: any) {
      console.error('Error loading rubric info:', error);
      setRubricInfoData(null);
      setRubricInfoError(
        error?.message || 'Failed to load rubric details. Please try again.'
      );
    } finally {
      setIsRubricInfoLoading(false);
    }
  };

  const handleCloseRubricInfo = () => {
    setIsRubricInfoOpen(false);
  };

  const handleCloseRubricHistory = () => {
    setIsRubricHistoryOpen(false);
    setSelectedFormerVersion(null);
  };


  // Filter skills for each panel
  const filteredAiSkills = useMemo(() => {
    if (!searchAi.trim()) {
      return aiSkills;
    }
    const query = searchAi.toLowerCase();
    return aiSkills.filter(skill =>
      skill.skillArea.toLowerCase().includes(query)
    );
  }, [aiSkills, searchAi]);

  const filteredStudentSkills = useMemo(() => {
    const combined = [...studentSkills, ...studentExtraSkills];
    if (!searchStudent.trim()) {
      return combined;
    }
    const query = searchStudent.toLowerCase();
    return combined.filter(skill =>
      skill.skillArea.toLowerCase().includes(query)
    );
  }, [studentSkills, studentExtraSkills, searchStudent]);

  const filteredTeacherSkills = useMemo(() => {
    if (!searchTeacher.trim()) {
      return teacherSkills;
    }
    const query = searchTeacher.toLowerCase();
    return teacherSkills.filter(skill =>
      skill.skillArea.toLowerCase().includes(query)
    );
  }, [teacherSkills, searchTeacher]);

  const rubricLevelOptions = useMemo(() => {
    const headers = selectedRubricData?.headers || [];
    const levelCount = Math.max(1, headers.length || 0);
    return Array.from({ length: levelCount }, (_, i) => ({
      value: String(i + 1),
      label: headers[i]?.trim() ? headers[i] : `Level ${i + 1}`,
    }));
  }, [selectedRubricData]);

  const toRubricLevelLabel = useCallback(
    (scoreRaw: string): string => {
      const score = Number(scoreRaw);
      if (!Number.isInteger(score) || score <= 0) return '';
      const headers = selectedRubricData?.headers || [];
      const header = headers[score - 1];
      return header && header.trim() ? header : `Level ${score}`;
    },
    [selectedRubricData]
  );

  /** Student in edit mode: preview AI run before Save; otherwise show saved AI scores. */
  const aiEvaluationsForDisplay = useMemo(() => {
    if (isStudent && draftAiEvaluations) {
      return draftAiEvaluations;
    }
    return aiEvaluations;
  }, [isStudent, draftAiEvaluations, aiEvaluations]);

  const hasUnsavedEvaluationChanges = useMemo(() => {
    const serializeScoreMap = (scores: { [skillArea: string]: string }) =>
      JSON.stringify(
        Object.keys(scores)
          .sort()
          .map((k) => [k, scores[k] ?? ''])
      );
    const serializeSkillNames = (skills: Skill[]) =>
      JSON.stringify(
        [...skills.map((s) => s.skillArea)]
          .filter((name) => name.trim() !== '')
          .sort()
      );

    const currentPortfolioName = uploadedFiles[0]?.name || portfolioDisplayName || '';
    const hasPortfolioChange = currentPortfolioName !== (originalPortfolioDisplayName || '');
    const hasStudentScoreChange =
      serializeScoreMap(studentEvaluations) !== serializeScoreMap(originalStudentEvaluations);
    const hasStudentSkillChange =
      serializeSkillNames(studentExtraSkills) !==
      serializeSkillNames(originalStudentExtraSkills);
    const hasAiDraftPreview = draftAiEvaluations !== null;

    return (
      hasPortfolioChange ||
      hasStudentScoreChange ||
      hasStudentSkillChange ||
      hasAiDraftPreview
    );
  }, [
    uploadedFiles,
    portfolioDisplayName,
    originalPortfolioDisplayName,
    studentEvaluations,
    originalStudentEvaluations,
    studentExtraSkills,
    originalStudentExtraSkills,
    draftAiEvaluations,
  ]);

  const hasUnsavedEvaluationResultChanges = useMemo(() => {
    const serializeScoreMap = (scores: { [skillArea: string]: string }) =>
      JSON.stringify(
        Object.keys(scores)
          .sort()
          .map((k) => [k, scores[k] ?? ''])
      );
    const serializeSkillNames = (skills: Skill[]) =>
      JSON.stringify(
        [...skills.map((s) => s.skillArea)]
          .filter((name) => name.trim() !== '')
          .sort()
      );

    const hasStudentScoreChange =
      serializeScoreMap(studentEvaluations) !== serializeScoreMap(originalStudentEvaluations);
    const hasStudentSkillChange =
      serializeSkillNames(studentExtraSkills) !==
      serializeSkillNames(originalStudentExtraSkills);
    const hasAiDraftPreview = draftAiEvaluations !== null;

    return hasStudentScoreChange || hasStudentSkillChange || hasAiDraftPreview;
  }, [
    studentEvaluations,
    originalStudentEvaluations,
    studentExtraSkills,
    originalStudentExtraSkills,
    draftAiEvaluations,
  ]);

  const isConfirmDisabled =
    !selectedRubricId || selectedRubricId === confirmedRubricId;
  const hasSelectedPortfolio =
    uploadedFiles.length > 0 ||
    !!portfolioDisplayName ||
    (typeof savedSkillEvaluationId === 'number' && savedSkillEvaluationId > 0);
  const hasSelectedRubric = !!confirmedRubricId;
  const canSaveEvaluation = (() => {
    if (!confirmedRubricId || !selectedRubricData || isSavingEvaluation || isStudentEvaluationLocked) {
      return false;
    }
    const hasSavedEvaluationId =
      typeof savedSkillEvaluationId === 'number' && savedSkillEvaluationId > 0;
    if (!hasSavedEvaluationId) {
      return true;
    }
    const hasRubricChange =
      !!originalConfirmedRubricId && confirmedRubricId !== originalConfirmedRubricId;
    return hasUnsavedEvaluationChanges || hasRubricChange;
  })();

  const canRequestTeacherEvaluation = useMemo(() => {
    if (isStudentEvaluationLocked) return false;
    if (!selectedRubricData || !confirmedRubricId) return false;
    if (!(typeof savedSkillEvaluationId === 'number' && savedSkillEvaluationId > 0)) return false;
    if (hasUnsavedEvaluationChanges) return false;
    if (skillEvaluationStatus === 'pending' || skillEvaluationStatus === 'completed') return false;

    const requiredSkillAreas = selectedRubricData.rows
      .map((row) => row.skillArea?.trim() || '')
      .filter((name) => name !== '');

    const isFilledPositiveInteger = (value: string | undefined) =>
      typeof value === 'string' && /^\d+$/.test(value.trim()) && Number(value.trim()) > 0;

    const hasAllStudentScores = requiredSkillAreas.every((skillArea) =>
      isFilledPositiveInteger(studentEvaluations[skillArea])
    );
    const hasAllAiScores = requiredSkillAreas.every((skillArea) =>
      isFilledPositiveInteger(aiEvaluationsForDisplay[skillArea])
    );

    return hasAllStudentScores && hasAllAiScores;
  }, [
    selectedRubricData,
    confirmedRubricId,
    savedSkillEvaluationId,
    hasUnsavedEvaluationChanges,
    skillEvaluationStatus,
    studentEvaluations,
    aiEvaluationsForDisplay,
    isStudentEvaluationLocked,
  ]);

  const handleCancelStudentEdits = () => {
    if (isStudentEvaluationLocked) return;
    setStudentSkills(originalStudentSkills.map((s) => ({ ...s })));
    setStudentExtraSkills(originalStudentExtraSkills.map((s) => ({ ...s })));
    setStudentEvaluations({ ...originalStudentEvaluations });
    setAiEvaluations({ ...originalAiEvaluations });
    setDraftAiEvaluations(null);
  };

  const handleAddStudentSkill = () => {
    if (isStudentEvaluationLocked) return;
    const base = 'New Skill';
    const existing = new Set(
      [...studentSkills, ...studentExtraSkills].map((s) => s.skillArea)
    );
    let nextName = base;
    let i = 2;
    while (existing.has(nextName)) {
      nextName = `${base} ${i}`;
      i += 1;
    }

    setStudentExtraSkills((prev) => [...prev, { skillArea: nextName }]);
    setStudentEvaluations((prev) => ({ ...prev, [nextName]: '' }));
  };

  const handleDeleteStudentCustomSkill = (skillArea: string) => {
    if (isStudentEvaluationLocked) return;
    setStudentExtraSkills((prev) => prev.filter((s) => s.skillArea !== skillArea));
    setStudentEvaluations((prev) => {
      const next = { ...prev };
      delete next[skillArea];
      return next;
    });
  };

  const handleRenameStudentCustomSkill = (oldSkillArea: string, nextSkillAreaRaw: string) => {
    if (isStudentEvaluationLocked) return;
    const nextSkillArea = nextSkillAreaRaw.trim();
    if (!nextSkillArea || nextSkillArea === oldSkillArea) return;

    const existing = new Set(
      [...studentSkills, ...studentExtraSkills].map((s) => s.skillArea)
    );
    existing.delete(oldSkillArea);

    if (existing.has(nextSkillArea)) {
      alert('That skill name already exists.');
      return;
    }

    setStudentExtraSkills((prev) =>
      prev.map((s) => (s.skillArea === oldSkillArea ? { ...s, skillArea: nextSkillArea } : s))
    );
    setStudentEvaluations((prev) => {
      const next = { ...prev };
      const oldVal = next[oldSkillArea] ?? '';
      delete next[oldSkillArea];
      next[nextSkillArea] = oldVal;
      return next;
    });
  };

  return (
    <div className="profile-wrapper">
      {/* Your Profile Section */}
      <div className="portfolio-container">
        <div className="portfolio-section">
          <div className="profile2-profile-title-row">
            <h2 className="portfolio-section-title profile2-profile-title">Your Profile</h2>
            {isStudent && (
              <button
                type="button"
                className="profile2-delete-eval-header-button"
                title="Delete evaluation"
                aria-label="Delete evaluation"
                onClick={handleDeleteEvaluation}
                disabled={isStudentEvaluationLocked}
              >
                {React.createElement(DeleteOutlineIcon)}
              </button>
            )}
          </div>

          <div className="profile2-upload-row">
            <input
              ref={(el) => (fileInputRef.current = el)}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf"
            />

            <button
              className="profile2-upload-button"
              onClick={handleUploadClick}
              type="button"
              disabled={isStudentEvaluationLocked}
            >
              <span className="profile2-upload-icon">
                {React.createElement(BriefcaseIcon)}
              </span>
              <span className="profile2-upload-label">
                {uploadedFiles[0]?.name || portfolioDisplayName || 'Upload File'}
              </span>
            </button>

            {isStudent && uploadedFiles.length > 0 && (
              <button
                type="button"
                className="profile2-remove-file-button"
                title="Remove uploaded file"
                aria-label="Remove uploaded file"
                onClick={handleRemoveUploadedFile}
                disabled={isStudentEvaluationLocked}
              >
                {React.createElement(DeleteOutlineIcon)}
              </button>
            )}

            <span className="profile2-upload-hint">
              Max file size 10MB.
            </span>
          </div>
        </div>
      </div>

      {/* Choose Rubric Score Section */}
      <div className="rubric-score-container">
        <h2 className="portfolio-section-title" style={{ marginBottom: '20px' }}>Choose Rubric Score</h2>
        <div className="rubric-score-search-container">
          <input
            type="text"
            className="rubric-score-search-input"
            placeholder="Search rubric score"
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
          {isLoadingRubrics ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading rubrics...</div>
          ) : (
            filteredRubricScores.map((rubric) => (
              <div
                key={rubric.id}
                className={`rubric-score-bar profile2-rubric-bar ${selectedRubricId === rubric.id ? 'selected' : ''}`}
                onClick={() => handleRubricSelect(rubric.id)}
                style={{
                  backgroundColor: selectedRubricId === rubric.id ? 'rgba(178, 187, 30, 0.8)' : '#ffffff',
                  cursor: isStudentEvaluationLocked ? 'not-allowed' : 'pointer',
                  position: 'relative'
                }}
              >
                <span className="rubric-score-bar-title">{rubric.title}</span>
                <button
                  className="profile2-view-details-button"
                  title="View rubric details"
                  type="button"
                  aria-label="More information"
                  onClick={(e) => handleOpenRubricInfo(e, rubric.id)}
                >
                  <span className="profile2-view-details-icon">
                    {React.createElement(InfoIcon)}
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
        <div className="rubric-score-actions">
          <button
            type="button"
            className="profile2-confirm-rubric-button"
            onClick={handleConfirmRubric}
            disabled={isConfirmDisabled || isStudentEvaluationLocked}
          >
            Confirm Selection
          </button>
        </div>
      </div>

      {/* Evaluation Results Section */}
      <div className="evaluation-container">
        <div className="evaluation-section">
          <div className="evaluation-header-container">
            <h2 className="evaluation-section-title">
              Evaluation Results
              {selectedRubricData && (
                <span className="evaluation-section-title-rubric">
                  {' '}
                  — {selectedRubricData.title}
                </span>
              )}
            </h2>
            <div className="evaluation-header-actions">
              {isStudent && (
                <button
                  className={`profile2-request-evaluation-button ${
                    hasUnsavedEvaluationChanges
                      ? 'profile2-save-evaluation-button-active'
                      : 'profile2-save-evaluation-button-idle'
                  }`}
                  type="button"
                  disabled={!canSaveEvaluation}
                  onClick={() => void handleSaveEvaluationToBackend()}
                >
                  {isSavingEvaluation ? 'Saving...' : 'Save Evaluation'}
                </button>
              )}
              {isStudent && (
              <button
                className="profile2-ai-evaluate-button"
                type="button"
                disabled={!canRunAiEvaluation}
                title={
                  !extractedPortfolioText.trim()
                    ? 'Upload and import a portfolio first'
                    : !confirmedRubricId || !selectedRubricData
                      ? 'Confirm a rubric first'
                      : 'Run AI evaluation — click Save below to keep results'
                }
                onClick={() => runAiEvaluation()}
              >
                {isAiEvaluating ? 'Evaluating…' : 'Evaluate with AI'}
              </button>
              )}
              {isStudent && (
                <button
                  className="profile2-request-evaluation-button"
                  type="button"
                  disabled={!canRequestTeacherEvaluation}
                  onClick={() => void handleRequestTeacherEvaluation()}
                >
                  Request Teacher Evaluation
                </button>
              )}

            </div>
          </div>
          
          {isLoadingRubricData ? (
            <div className="evaluation-content">
              <p className="evaluation-message">Loading rubric data...</p>
            </div>
          ) : !hasSelectedPortfolio || !hasSelectedRubric ? (
            <div className="evaluation-content">
              <p className="evaluation-message">
                Please upload/select a portfolio and confirm a rubric score first.
              </p>
              <p className="evaluation-submessage">
                Evaluation results will appear after both selections are completed.
              </p>
            </div>
          ) : selectedRubricData && selectedRubricData.rows.length > 0 ? (
            <>
              {isAiEvaluating && (
                <div className="evaluation-content">
                  <p className="evaluation-submessage">AI is evaluating the selected portfolio...</p>
                </div>
              )}
              {/* AI + Student (student role) or AI + Teacher (teacher role); feature flag until login */}
              <div className={`skills-panels-container ${evaluationPanelsGridClass}`}>
                <div className="skills-panel profile2-panel">
                  <h2 className="panel-title">
                    AI
                  </h2>
                  {isStudent && draftAiEvaluations && (
                    <p className="profile2-ai-draft-hint" role="status">
                      Preview only — click <strong>Save</strong> to keep these AI scores.
                    </p>
                  )}
                  <div className="search-container">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search skills"
                      value={searchAi}
                      onChange={(e) => setSearchAi(e.target.value)}
                    />
                    {searchAi && (
                      <button
                        className="clear-search"
                        onClick={() => setSearchAi('')}
                      >
                        {React.createElement(CloseIcon)}
                      </button>
                    )}
                  </div>
                  <div className="skills-list">
                    {filteredAiSkills.map((skill, index) => (
                      <div key={index} className="skill-item profile2-skill-item">
                        <span className="skill-name">
                          {skill.skillArea}
                        </span>
                        <input
                          type="text"
                          className="profile2-score-input ai-score-input"
                          value={toRubricLevelLabel(aiEvaluationsForDisplay[skill.skillArea] || '')}
                          readOnly
                          placeholder="Auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {!isTeacher && (
                <div className="skills-panel profile2-panel">
                  <h2 className="panel-title">
                    Student
                  </h2>
                  <div className="search-container">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search skills"
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                    />
                    {searchStudent && (
                      <button
                        className="clear-search"
                        onClick={() => setSearchStudent('')}
                      >
                        {React.createElement(CloseIcon)}
                      </button>
                    )}
                  </div>
                  <div className="skills-list">
                    {filteredStudentSkills.map((skill, index) => (
                      <div key={index} className="skill-item profile2-skill-item profile2-skill-item-deletable">
                        {isStudent &&
                          !isStudentEvaluationLocked &&
                          studentExtraSkills.some((s) => s.skillArea === skill.skillArea) && (
                            <button
                              type="button"
                              className="profile2-skill-delete-button"
                              title="Remove skill"
                              aria-label="Remove skill"
                              onClick={() => handleDeleteStudentCustomSkill(skill.skillArea)}
                            >
                              {React.createElement(CloseIcon)}
                            </button>
                          )}
                        {isStudent &&
                        !isStudentEvaluationLocked &&
                        studentExtraSkills.some((s) => s.skillArea === skill.skillArea) ? (
                          <input
                            type="text"
                            className="profile2-custom-skill-name-input"
                            defaultValue={skill.skillArea}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.currentTarget as HTMLInputElement).blur();
                              } else if (e.key === 'Escape') {
                                e.currentTarget.value = skill.skillArea;
                                (e.currentTarget as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={(e) => handleRenameStudentCustomSkill(skill.skillArea, e.target.value)}
                          />
                        ) : (
                          <span className="skill-name">{skill.skillArea}</span>
                        )}
                        {isStudentEvaluationCompleted ? (
                          <input
                            type="text"
                            className="profile2-score-input student-score-input"
                            value={toRubricLevelLabel(studentEvaluations[skill.skillArea] || '')}
                            readOnly
                            placeholder="-"
                          />
                        ) : (
                          <select
                            className="profile2-score-input student-score-input"
                            value={studentEvaluations[skill.skillArea] || ''}
                            disabled={!isStudent || isStudentEvaluationLocked}
                            onChange={
                              !isStudent || isStudentEvaluationLocked
                                ? undefined
                                : (e) => {
                                    const value = e.target.value;
                                    setStudentEvaluations(prev => ({
                                      ...prev,
                                      [skill.skillArea]: value
                                    }));
                                  }
                            }
                          >
                            <option value="">-</option>
                            {rubricLevelOptions.map((level) => (
                              <option key={level.value} value={level.value}>
                                {level.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                    {isStudent && !isStudentEvaluationLocked && (
                      <div
                        className="rubric-score-add-box"
                        onClick={handleAddStudentSkill}
                        title="Add Skill"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleAddStudentSkill();
                          }
                        }}
                      >
                        <span className="rubric-score-add-box-spacer"></span>
                        <button
                          className="rubric-score-add-box-button"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddStudentSkill();
                          }}
                          title="Add Skill"
                        >
                          {React.createElement(PlusIcon)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                )}
                {shouldShowTeacherPanel && (
                <div className="skills-panel profile2-panel">
                  <h2 className="panel-title">
                    Teacher
                  </h2>
                  <div className="search-container">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search skills"
                      value={searchTeacher}
                      onChange={(e) => setSearchTeacher(e.target.value)}
                    />
                    {searchTeacher && (
                      <button
                        className="clear-search"
                        onClick={() => setSearchTeacher('')}
                      >
                        {React.createElement(CloseIcon)}
                      </button>
                    )}
                  </div>
                  <div className="skills-list">
                    {filteredTeacherSkills.map((skill, index) => (
                      <div key={index} className="skill-item profile2-skill-item">
                        <span className="skill-name">
                          {skill.skillArea}
                        </span>
                        <input
                          type="text"
                          className="profile2-score-input teacher-score-input"
                          value={toRubricLevelLabel(teacherEvaluations[skill.skillArea] || '')}
                          readOnly
                          placeholder="—"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>

              {isStudent && (
                <div className="profile3-submit-button-container">
                  {skillEvaluationStatus === 'pending' ? (
                    <button
                      className="profile2-request-evaluation-button"
                      type="button"
                      onClick={() => void handleCancelPendingRequest()}
                      disabled={hasTeacherSubmittedScores}
                    >
                      Cancel Request
                    </button>
                  ) : (
                    <button
                      className="profile2-request-evaluation-button"
                      type="button"
                      onClick={handleCancelStudentEdits}
                      disabled={!hasUnsavedEvaluationResultChanges || isStudentEvaluationLocked}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="evaluation-content">
              <p className="evaluation-message">No evaluation results available yet.</p>
              <p className="evaluation-submessage">Select a rubric score to see evaluation results.</p>
            </div>
          )}
        </div>
      </div>

      {isRubricInfoOpen && (
        <div
          className="modal-overlay"
          onClick={handleCloseRubricInfo}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '900px', width: '95%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">
              {rubricInfoData?.title || 'Rubric Details'}
            </h2>

            {isRubricInfoLoading && (
              <div className="evaluation-content">
                <p className="evaluation-message">Loading rubric table...</p>
              </div>
            )}

            {!isRubricInfoLoading && rubricInfoError && (
              <div className="evaluation-content">
                <p className="evaluation-message">{rubricInfoError}</p>
              </div>
            )}

            {!isRubricInfoLoading && !rubricInfoError && rubricInfoData && (
              <div className="evaluation-table-container">
                <table className="evaluation-table">
                  <thead>
                    <tr>
                      <th className="evaluation-table-header">Skill Area</th>
                      {rubricInfoData.headers.map((header, index) => (
                        <th key={index} className="evaluation-table-header">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rubricInfoData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <th className="evaluation-table-row-header">
                          {row.skillArea}
                        </th>
                        {row.values.map((value, valueIndex) => (
                          <td
                            key={valueIndex}
                            className="evaluation-table-cell"
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-buttons">
              <button
                type="button"
                className="modal-button modal-button-cancel"
                onClick={handleCloseRubricInfo}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rubric history popup (mock UI) */}
      {isRubricHistoryOpen && (
        <div className="rubric-modal-overlay" onClick={handleCloseRubricHistory}>
          <div className="rubric-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="rubric-modal-header">
              <h2 className="rubric-modal-title">
                {selectedFormerVersion ? 'Former rubric detail' : 'Former rubric versions'}
              </h2>
              <button
                type="button"
                className="rubric-modal-close"
                onClick={handleCloseRubricHistory}
                aria-label="Close"
                title="Close"
              >
                {React.createElement(CloseIcon)}
              </button>
            </div>

            {selectedFormerVersion ? (
              <>
                <div className="rubric-history-detail-meta">
                  <div>Name: {selectedFormerVersion.title}</div>
                  <div>Created: {selectedFormerVersion.createdAt}</div>
                  <div>Expires: {selectedFormerVersion.expiresAt}</div>
                </div>

                <RubricScoreTable
                  headers={selectedFormerVersion.headers}
                  rows={selectedFormerVersion.rows}
                  onHeadersChange={() => {}}
                  onRowsChange={() => {}}
                  readOnly={true}
                />

                <div className="rubric-modal-actions">
                  <button
                    type="button"
                    className="rubric-modal-button secondary"
                    onClick={() => setSelectedFormerVersion(null)}
                  >
                    Back to versions
                  </button>
                  <button
                    type="button"
                    className="rubric-modal-button"
                    onClick={handleCloseRubricHistory}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="rubric-history-list">
                  {formerRubricVersions.map((item) => (
                    <button
                      key={item.version}
                      type="button"
                      className="rubric-history-item rubric-history-item-button"
                      onClick={() => {
                        if (!confirmedRubricId) return;
                        navigate('/rubric_version_detail', {
                          state: {
                            portfolioUsedFileName: uploadedFiles[0]?.name || 'portfolio.pdf',
                            rubricId: confirmedRubricId,
                            rubricVersion: item,
                          },
                        });
                      }}
                    >
                      <div className="rubric-history-left">
                        <div className="rubric-history-version">{item.version}</div>
                        <div className="rubric-history-meta">Created: {item.createdAt}</div>
                      </div>
                      <div className="rubric-history-right">
                        <div className="rubric-history-exp">Expires: {item.expiresAt}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="rubric-modal-actions">
                  <button
                    type="button"
                    className="rubric-modal-button"
                    onClick={handleCloseRubricHistory}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile2;
