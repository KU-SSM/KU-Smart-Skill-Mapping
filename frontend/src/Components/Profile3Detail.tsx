import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Profile.css';
import './RubricScore.css';
import { FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import { AiOutlineClose, AiOutlineInfoCircle, AiOutlinePlus } from 'react-icons/ai';
import { getRubricScores, getRubricScore, RubricScoreDetail } from '../services/rubricScoreApi';
import RubricScoreTable from './RubricScoreTable';
import { useAppRole } from '../context/AppRoleContext';
import api from '../api/index';
import { updateSkillEvaluation } from '../services/skillEvaluationApi';
import { getApiErrorDetail } from '../utils/apiErrors';

const PdfIcon = FaFilePdf as React.ComponentType;
const ArrowLeftIcon = FaArrowLeft as React.ComponentType;
const CloseIcon = AiOutlineClose as React.ComponentType;
const InfoIcon = AiOutlineInfoCircle as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;

interface Skill {
  skillArea: string;
}

interface StudentRequest {
  id: string;
  studentName: string;
  studentId: string;
  portfolioFileName: string;
  portfolioFileUrl?: string;
  rubricId: string;
  rubricTitle: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'completed';
}

interface SkillEvaluationFullResponse {
  id: number;
  rubric_score_history_id: number;
  portfolio_id: number;
  user_id: number;
  created_at?: string;
  status: string;
  ai_evaluated_skills: { skill_name: string; level_rank: number }[];
  student_evaluated_skills: { skill_name: string; level_rank: number }[];
  teacher_evaluated_skills: { id: number; skill_name: string; level_rank: number }[];
}

interface RubricHistoryResponse {
  id: number;
  rubric_score_id: number;
}

interface PortfolioResponse {
  id: number;
  filename?: string;
}

interface TableData {
  skillArea: string;
  values: string[];
}

interface FormerRubricVersion {
  version: string;
  createdAt: string;
  expiresAt: string;
  title: string;
  headers: string[];
  rows: TableData[];
}

const teacherCustomSkillsKey = (evaluationId: string) =>
  `evaluation_teacher_custom_skills_${evaluationId}`;

const readTeacherCustomSkills = (evaluationId: string): string[] => {
  try {
    const raw = localStorage.getItem(teacherCustomSkillsKey(evaluationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v !== '');
  } catch {
    return [];
  }
};

const writeTeacherCustomSkills = (evaluationId: string, skills: string[]): void => {
  try {
    const normalized = skills
      .map((s) => s.trim())
      .filter((s) => s !== '');
    localStorage.setItem(teacherCustomSkillsKey(evaluationId), JSON.stringify(normalized));
  } catch {
    // ignore localStorage errors
  }
};

const Profile3Detail: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { isStudent, isTeacher } = useAppRole();

  const [selectedRequest, setSelectedRequest] = useState<StudentRequest | null>(null);
  const [requestNotFound, setRequestNotFound] = useState<boolean>(false);
  const isCompletedView =
    selectedRequest?.status === 'approved' || selectedRequest?.status === 'completed';
  const shouldDashStudentRowsForTeacher =
    isTeacher && selectedRequest?.status === 'approved';
  /* Teacher: hide Student panel while pending; show it after completion/approval. */
  const evaluationPanelsGridClass = isTeacher
    ? isCompletedView
      ? 'profile2-three-panels'
      : 'profile2-two-panels'
    : isStudent && isCompletedView
      ? 'profile2-three-panels'
      : 'profile2-two-panels';

  // Rubric selection and data
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<{ id: string; title: string }[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [confirmedRubricId, setConfirmedRubricId] = useState<string | null>(null);
  const [selectedRubricData, setSelectedRubricData] = useState<RubricScoreDetail | null>(null);
  const [isLoadingRubrics, setIsLoadingRubrics] = useState<boolean>(true);
  const [isLoadingRubric, setIsLoadingRubric] = useState<boolean>(false);
  const [isRubricInfoOpen, setIsRubricInfoOpen] = useState<boolean>(false);
  const [rubricInfoData, setRubricInfoData] = useState<RubricScoreDetail | null>(null);
  const [isRubricInfoLoading, setIsRubricInfoLoading] = useState<boolean>(false);
  const [rubricInfoError, setRubricInfoError] = useState<string | null>(null);
  const [teacherScores, setTeacherScores] = useState<{ [skillArea: string]: string }>({});
  const teacherScoresRef = useRef(teacherScores);
  teacherScoresRef.current = teacherScores;
  /** Teacher-added custom names not yet in localStorage — must not be pruned when syncing student rows. */
  const locallyAddedTeacherCustomRef = useRef<Set<string>>(new Set());
  /** Tracks student (non-rubric) skill names so we can drop matching teacher rows when the student removes a custom. */
  const prevStudentExtrasRef = useRef<Set<string>>(new Set());
  const [aiEvaluations, setAiEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [studentEvaluations, setStudentEvaluations] = useState<{ [skillArea: string]: string }>({});
  const [teacherExtraSkills, setTeacherExtraSkills] = useState<Skill[]>([]);
  const [originalTeacherScores, setOriginalTeacherScores] = useState<{ [skillArea: string]: string }>({});
  const [originalTeacherExtraSkills, setOriginalTeacherExtraSkills] = useState<Skill[]>([]);
  const [searchAi, setSearchAi] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [searchTeacher, setSearchTeacher] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingEvaluation, setIsSavingEvaluation] = useState<boolean>(false);
  const [isRubricHistoryOpen, setIsRubricHistoryOpen] = useState<boolean>(false);
  const [selectedFormerVersion, setSelectedFormerVersion] = useState<FormerRubricVersion | null>(null);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);

  const toScoreMap = useCallback((rows: { skill_name: string; level_rank: number }[]) => {
    const out: { [skillArea: string]: string } = {};
    rows.forEach((row) => {
      if (!row.skill_name) return;
      out[row.skill_name] = String(row.level_rank ?? '');
    });
    return out;
  }, []);

  useEffect(() => {
    const parsedId = Number(requestId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setRequestNotFound(true);
      return;
    }

    const loadRequest = async () => {
      try {
        setRequestNotFound(false);
        const full = await api.get<SkillEvaluationFullResponse>(`skill_evaluation/${parsedId}/full`);
        const ev = full.data;

        const rh = await api.get<RubricHistoryResponse>(`rubric_score_history/${ev.rubric_score_history_id}`);
        const rubricRes = await api.get<{ id: number; name?: string }>(`rubric/${rh.data.rubric_score_id}`);
        const userRes = await api.get<{ id: number; name?: string }>(`user/${ev.user_id}`);
        const portfolioRes = await api.get<PortfolioResponse>(`portfolio/${ev.portfolio_id}`);

        const rubricId = String(rh.data.rubric_score_id);
        const studentName = userRes.data.name || `Student #${ev.user_id}`;
        const rubricTitle = rubricRes.data.name || `Rubric #${rubricId}`;
        const portfolioFileName =
          (portfolioRes.data.filename || '').trim() || `Portfolio #${ev.portfolio_id}`;

        setSelectedRequest({
          id: String(ev.id),
          studentName,
          studentId: String(ev.user_id),
          portfolioFileName,
          rubricId,
          rubricTitle,
          requestedAt: ev.created_at || '',
          status:
            ev.status === 'pending'
              ? 'pending'
              : ev.status === 'completed'
                ? 'completed'
                : 'approved',
        });
        setSelectedPortfolioId(ev.portfolio_id);
        setSelectedRubricId(rubricId);
        setConfirmedRubricId(rubricId);
        setAiEvaluations(toScoreMap(ev.ai_evaluated_skills || []));

        const studentMap = toScoreMap(ev.student_evaluated_skills || []);
        const rubricDetail = await getRubricScore(rubricId);
        const rubricSetHydrate = new Set(
          rubricDetail.rows.map((r) => (r.skillArea || '').trim()).filter((n) => n !== '')
        );

        setStudentEvaluations(studentMap);

        const hydratedTeacherScores = toScoreMap(ev.teacher_evaluated_skills || []);
        const savedTeacherCustomSkills = readTeacherCustomSkills(String(ev.id));
        const savedTeacherTrimmed = new Set(
          savedTeacherCustomSkills.map((s) => s.trim()).filter(Boolean)
        );
        savedTeacherCustomSkills.forEach((skillArea) => {
          if (!(skillArea in hydratedTeacherScores)) {
            hydratedTeacherScores[skillArea] = '0';
          }
        });
        Object.keys({ ...hydratedTeacherScores }).forEach((k) => {
          const t = k.trim();
          if (!t || rubricSetHydrate.has(t)) return;
          const inStudent = Object.keys(studentMap).some((sk) => sk.trim() === t);
          if (!inStudent && !savedTeacherTrimmed.has(t)) {
            delete hydratedTeacherScores[k];
          }
        });

        prevStudentExtrasRef.current = new Set(
          Object.keys(studentMap)
            .map((k) => k.trim())
            .filter((t) => t !== '' && !rubricSetHydrate.has(t))
        );

        setTeacherScores(hydratedTeacherScores);
        setTeacherExtraSkills([]);
        /* originalTeacher* aligned after rubric loads — see sync effect. */
      } catch (error) {
        console.error('Failed to load evaluation request:', error);
        setRequestNotFound(true);
      }
    };

    void loadRequest();
  }, [requestId, toScoreMap]);

  useEffect(() => {
    locallyAddedTeacherCustomRef.current.clear();
    prevStudentExtrasRef.current.clear();
  }, [requestId]);

  // Load rubric list on mount
  useEffect(() => {
    const loadRubrics = async () => {
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
    loadRubrics();
  }, []);

  // Fetch rubric definition only when the evaluation's rubric id changes — not when the teacher edits scores
  // (including teacherScores in deps re-ran loading, toggled the panel, and jumped scroll to top).
  useEffect(() => {
    if (!confirmedRubricId) {
      setSelectedRubricData(null);
      setTeacherExtraSkills([]);
      return;
    }

    let cancelled = false;
    const loadRubricData = async () => {
      try {
        setIsLoadingRubric(true);
        const rubricData = await getRubricScore(confirmedRubricId);
        if (cancelled) return;
        setSelectedRubricData(rubricData);
      } catch (error) {
        console.error('Error loading rubric data:', error);
        if (!cancelled) {
          setSelectedRubricData(null);
          setTeacherExtraSkills([]);
        }
      } finally {
        if (!cancelled) setIsLoadingRubric(false);
      }
    };

    void loadRubricData();
    return () => {
      cancelled = true;
    };
  }, [confirmedRubricId]);

  // After rubric + student eval are known: sync teacher rows with current student data.
  // Drop teacher rows for student customs the student removed (unless they are teacher-listed customs).
  // Seed missing student customs. Align baseline (original) so Save only lights on real edits.
  useEffect(() => {
    if (!selectedRubricData || !selectedRequest?.id) return;

    const rubricSkillSet = new Set(
      selectedRubricData.rows
        .map((row) => (row.skillArea || '').trim())
        .filter((name) => name !== '')
    );

    const teacherCustomNames = new Set(
      readTeacherCustomSkills(selectedRequest.id).map((s) => s.trim()).filter(Boolean)
    );

    const currentStudentExtras = new Set(
      Object.keys(studentEvaluations)
        .map((k) => k.trim())
        .filter((t) => t !== '' && !rubricSkillSet.has(t))
    );

    const prev = { ...teacherScoresRef.current };
    const next: { [skillArea: string]: string } = { ...prev };

    const prevStudentSnapshot = new Set(prevStudentExtrasRef.current);

    Object.keys(next).forEach((k) => {
      const t = k.trim();
      if (!t || rubricSkillSet.has(t)) return;
      const wasStudentExtra = prevStudentSnapshot.has(t);
      const isStudentExtraNow = currentStudentExtras.has(t);
      const teacherListedOrLocal =
        teacherCustomNames.has(t) || locallyAddedTeacherCustomRef.current.has(t);
      if (wasStudentExtra && !isStudentExtraNow && !teacherListedOrLocal) {
        delete next[k];
      }
    });

    Object.keys(studentEvaluations).forEach((skillArea) => {
      const t = skillArea.trim();
      if (!t || rubricSkillSet.has(t)) return;
      const hasTrimMatch = Object.keys(next).some((k) => k.trim() === t);
      if (!hasTrimMatch) {
        next[skillArea] = '0';
      }
    });

    const restoredTeacherExtras = Object.keys(next)
      .filter((k) => {
        const t = k.trim();
        return t !== '' && !rubricSkillSet.has(t);
      })
      .map((skillArea) => ({ skillArea }));

    const extraKeys = (m: { [k: string]: string }) =>
      Object.keys(m)
        .filter((k) => {
          const t = k.trim();
          return t !== '' && !rubricSkillSet.has(t);
        })
        .map((k) => k.trim())
        .sort();
    const scoresSame = JSON.stringify(prev) === JSON.stringify(next);
    const extrasSame = JSON.stringify(extraKeys(prev)) === JSON.stringify(extraKeys(next));

    if (scoresSame && extrasSame) {
      prevStudentExtrasRef.current = currentStudentExtras;
      return;
    }

    setTeacherScores(next);
    setOriginalTeacherScores({ ...next });
    setTeacherExtraSkills(restoredTeacherExtras);
    setOriginalTeacherExtraSkills(restoredTeacherExtras.map((s) => ({ ...s })));
    prevStudentExtrasRef.current = currentStudentExtras;
  }, [selectedRubricData, studentEvaluations, selectedRequest?.id]);

  const filteredRubricScores = useMemo(() => {
    if (!searchQuery.trim()) return rubricScores;
    const query = searchQuery.toLowerCase();
    return rubricScores.filter(rubric =>
      rubric.title.toLowerCase().includes(query)
    );
  }, [rubricScores, searchQuery]);

  const formerRubricVersions = useMemo<FormerRubricVersion[]>(() => {
    if (!selectedRubricData) return [];
    const now = new Date();
    const iso = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);
    const d1 = new Date(now);
    d1.setDate(d1.getDate() + 2);
    d1.setHours(23, 59, 59, 0);
    const d2 = new Date(now);
    d2.setDate(d2.getDate() + 10);
    d2.setHours(23, 59, 59, 0);

    const fullHeaders = selectedRubricData.headers;
    const trimmedHeaders =
      fullHeaders.length > 1 ? fullHeaders.slice(0, fullHeaders.length - 1) : fullHeaders;

    const buildRows = (headersToUse: string[]): TableData[] =>
      selectedRubricData.rows.map((r) => ({
        skillArea: r.skillArea,
        values: r.values.slice(0, headersToUse.length),
      }));

    return [
      {
        version: 'v1',
        title: `${selectedRubricData.title} (v1)`,
        createdAt: iso(new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)),
        expiresAt: iso(d1),
        headers: trimmedHeaders,
        rows: buildRows(trimmedHeaders),
      },
      {
        version: 'v2',
        title: `${selectedRubricData.title} (v2)`,
        createdAt: iso(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
        expiresAt: iso(d2),
        headers: fullHeaders,
        rows: buildRows(fullHeaders),
      },
    ];
  }, [selectedRubricData]);

  const handleRubricSelect = (rubricId: string) => {
    setSelectedRubricId(rubricId);
  };

  const handleConfirmRubric = () => {
    if (!selectedRubricId) return;
    setConfirmedRubricId(selectedRubricId);
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
      setRubricInfoError(error?.message || 'Failed to load rubric details. Please try again.');
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

  const handleOpenPortfolio = () => {
    if (!selectedPortfolioId) return;
    try {
      const fileUrl = api.getUri({ url: `portfolio/${selectedPortfolioId}/file` });
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to load portfolio for teacher view:', error);
      alert(`Failed to load portfolio: ${getApiErrorDetail(error)}`);
    }
  };

  const handleEditRubricFromInfo = () => {
    if (!rubricInfoData?.id) return;
    navigate(`/rubric_score/${rubricInfoData.id}`);
  };

  // Get skills from selected rubric
  const skills = useMemo((): Skill[] => {
    if (!selectedRubricData) return [];
    return selectedRubricData.rows.map(row => ({
      skillArea: row.skillArea
    }));
  }, [selectedRubricData]);

  const rubricSkillAreaSet = useMemo(
    () =>
      new Set(skills.map((s) => (s.skillArea || '').trim()).filter((name) => name !== '')),
    [skills]
  );

  /** Rubric rows first, then any non-rubric teacher rows (custom skills from API, localStorage, or in-progress edits). */
  const teacherSkillsAll = useMemo((): Skill[] => {
    if (!selectedRubricData) return [...skills, ...teacherExtraSkills];
    const extraOrdered: Skill[] = [];
    const seen = new Set<string>();
    const pushExtra = (raw: string) => {
      const t = raw.trim();
      if (!t || rubricSkillAreaSet.has(t) || seen.has(t)) return;
      seen.add(t);
      extraOrdered.push({ skillArea: t });
    };
    teacherExtraSkills.forEach((s) => pushExtra(s.skillArea));
    Object.keys(teacherScores).forEach((k) => pushExtra(k));
    if (selectedRequest?.id) {
      readTeacherCustomSkills(selectedRequest.id).forEach((n) => pushExtra(n));
    }
    return [...skills, ...extraOrdered];
  }, [
    selectedRubricData,
    skills,
    teacherExtraSkills,
    teacherScores,
    rubricSkillAreaSet,
    selectedRequest?.id,
  ]);

  /** Rubric rows first, then current student skills not on the rubric (from API only — no stale order). */
  const studentSkillsAll = useMemo((): Skill[] => {
    const rubricSkillSet = new Set(
      skills.map((s) => (s.skillArea || '').trim()).filter((name) => name !== '')
    );
    const extraKeys = Object.keys(studentEvaluations).filter((key) => {
      const t = key.trim();
      return t !== '' && !rubricSkillSet.has(t);
    });
    extraKeys.sort((a, b) => a.trim().localeCompare(b.trim()));
    const extras: Skill[] = extraKeys.map((skillArea) => ({ skillArea }));
    return [...skills, ...extras];
  }, [skills, studentEvaluations]);

  const filteredAiSkills = useMemo(() => {
    if (!searchAi.trim()) return skills;
    const query = searchAi.toLowerCase();
    return skills.filter(skill => skill.skillArea.toLowerCase().includes(query));
  }, [skills, searchAi]);

  const filteredStudentSkills = useMemo(() => {
    if (!searchStudent.trim()) return studentSkillsAll;
    const query = searchStudent.toLowerCase();
    return studentSkillsAll.filter((skill) =>
      skill.skillArea.toLowerCase().includes(query)
    );
  }, [studentSkillsAll, searchStudent]);

  const filteredTeacherSkills = useMemo(() => {
    if (!searchTeacher.trim()) return teacherSkillsAll;
    const query = searchTeacher.toLowerCase();
    return teacherSkillsAll.filter(skill => skill.skillArea.toLowerCase().includes(query));
  }, [teacherSkillsAll, searchTeacher]);

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
      if (!Number.isInteger(score)) return '';
      if (score === 0) return 'No Passing Criteria';
      if (score < 0) return '';
      const headers = selectedRubricData?.headers || [];
      const header = headers[score - 1];
      return header && header.trim() ? header : `Level ${score}`;
    },
    [selectedRubricData]
  );

  const handleAddTeacherSkill = () => {
    if (isCompletedView) return;
    const base = 'New Skill';
    const existing = new Set(teacherSkillsAll.map((s) => s.skillArea));
    let nextName = base;
    let i = 2;
    while (existing.has(nextName)) {
      nextName = `${base} ${i}`;
      i += 1;
    }

    locallyAddedTeacherCustomRef.current.add(nextName.trim());
    setTeacherExtraSkills((prev) => [...prev, { skillArea: nextName }]);
    setTeacherScores((prev) => ({ ...prev, [nextName]: '0' }));
  };

  const handleDeleteTeacherCustomSkill = (skillArea: string) => {
    if (isCompletedView) return;
    locallyAddedTeacherCustomRef.current.delete(skillArea.trim());
    setTeacherExtraSkills((prev) => prev.filter((s) => s.skillArea !== skillArea));
    setTeacherScores((prev) => {
      const next = { ...prev };
      delete next[skillArea];
      return next;
    });
  };

  const handleRenameTeacherCustomSkill = (oldSkillArea: string, nextSkillAreaRaw: string) => {
    if (isCompletedView) return;
    const nextSkillArea = nextSkillAreaRaw.trim();
    if (!nextSkillArea || nextSkillArea === oldSkillArea) return;

    const existing = new Set(teacherSkillsAll.map((s) => s.skillArea));
    existing.delete(oldSkillArea);

    if (existing.has(nextSkillArea)) {
      alert('That skill name already exists.');
      return;
    }

    locallyAddedTeacherCustomRef.current.delete(oldSkillArea.trim());
    locallyAddedTeacherCustomRef.current.add(nextSkillArea);
    setTeacherExtraSkills((prev) =>
      prev.map((s) => (s.skillArea === oldSkillArea ? { ...s, skillArea: nextSkillArea } : s))
    );
    setTeacherScores((prev) => {
      const next = { ...prev };
      const oldVal = next[oldSkillArea] ?? '';
      delete next[oldSkillArea];
      next[nextSkillArea] = oldVal;
      return next;
    });
  };

  const handleScoreChange = (skillArea: string, value: string) => {
    if (isCompletedView) return;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setTeacherScores(prev => ({
        ...prev,
        [skillArea]: value
      }));
    }
  };

  const hasUnsavedTeacherChanges = useMemo(() => {
    const snapshot = (scores: { [skillArea: string]: string }) =>
      JSON.stringify(
        teacherSkillsAll.map((s) => [s.skillArea, (scores[s.skillArea] ?? '').trim()])
      );
    return snapshot(teacherScores) !== snapshot(originalTeacherScores);
  }, [teacherSkillsAll, teacherScores, originalTeacherScores]);

  const allTeacherScoresFilled = useMemo(() => {
    if (!selectedRubricData || isCompletedView) return true;
    return !teacherSkillsAll.some((skill) => {
      const v = teacherScores[skill.skillArea];
      return typeof v !== 'string' || v.trim() === '';
    });
  }, [selectedRubricData, isCompletedView, teacherSkillsAll, teacherScores]);

  const persistTeacherEvaluations = useCallback(async (skillEvaluationId: number) => {
    const existingTeacherRows = await api.get<{ id: number }[]>(
      `skill_evaluation/${skillEvaluationId}/teacher_evaluated_skills`
    );
    await Promise.all(
      existingTeacherRows.data.map((row) => api.delete(`teacher_evaluated_skill/${row.id}`))
    );

    const rubricSkillSet = new Set(
      (selectedRubricData?.rows || [])
        .map((row) => (row.skillArea || '').trim())
        .filter((name) => name !== '')
    );
    const payloads = Object.entries(teacherScores)
      .map(([skillAreaRaw, scoreRaw]) => {
        const skillArea = skillAreaRaw.trim();
        const trimmedScore = scoreRaw.trim();
        if (skillArea === '') return null;
        const isCustomTeacherRow = !rubricSkillSet.has(skillArea);
        // Allow blank custom skill to be persisted as "No Passing Criteria" (0).
        const normalizedScore =
          trimmedScore === '' && isCustomTeacherRow ? '0' : trimmedScore;
        if (!/^\d+$/.test(normalizedScore) || Number(normalizedScore) < 0) return null;
        return { skillArea, score: normalizedScore };
      })
      .filter((item): item is { skillArea: string; score: string } => item !== null);

    await Promise.all(
      payloads.map(({ skillArea, score }) =>
        api.post('teacher_evaluated_skill/', {
          skill_evaluation_id: skillEvaluationId,
          skill_name: skillArea,
          level_rank: Number(score),
        })
      )
    );
  }, [teacherScores, selectedRubricData]);

  const handleSaveTeacherEvaluation = useCallback(async () => {
    if (!selectedRequest) return;
    try {
      setIsSavingEvaluation(true);
      const skillEvaluationId = Number(selectedRequest.id);
      await persistTeacherEvaluations(skillEvaluationId);
      writeTeacherCustomSkills(
        String(skillEvaluationId),
        teacherExtraSkills.map((s) => s.skillArea)
      );
      setOriginalTeacherScores({ ...teacherScores });
      setOriginalTeacherExtraSkills(teacherExtraSkills.map((s) => ({ ...s })));
      alert('Teacher evaluation saved.');
    } catch (error) {
      console.error('Failed to save teacher evaluation:', error);
      alert(`Failed to save evaluation: ${getApiErrorDetail(error)}`);
    } finally {
      setIsSavingEvaluation(false);
    }
  }, [selectedRequest, persistTeacherEvaluations, teacherScores, teacherExtraSkills]);

  const handleSubmitEvaluation = async () => {
    if (!selectedRequest || !selectedRubricData) return;

    // Validate that all skills have scores (rubric + teacher extras, including student custom skills)
    const missingScores = teacherSkillsAll.filter(
      (skill) => !teacherScores[skill.skillArea] || teacherScores[skill.skillArea].trim() === ''
    );
    if (missingScores.length > 0) {
      alert(`Please fill in scores for all skills. Missing: ${missingScores.map(s => s.skillArea).join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);
      const skillEvaluationId = Number(selectedRequest.id);
      await persistTeacherEvaluations(skillEvaluationId);
      writeTeacherCustomSkills(
        String(skillEvaluationId),
        teacherExtraSkills.map((s) => s.skillArea)
      );

      await updateSkillEvaluation(skillEvaluationId, { status: 'approved' });
      setOriginalTeacherScores({ ...teacherScores });
      setOriginalTeacherExtraSkills(teacherExtraSkills.map((s) => ({ ...s })));
      setSelectedRequest((prev) =>
        prev
          ? {
              ...prev,
              status: 'approved',
            }
          : prev
      );
      alert('Evaluation submitted and marked as approved.');
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert(`Failed to submit evaluation: ${getApiErrorDetail(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!selectedRequest && !requestNotFound) {
    return (
      <div className="profile-wrapper">
        <div className="portfolio-container">
          <div className="portfolio-section">
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <p>Loading student request...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedRequest || requestNotFound) {
    return (
      <div className="profile-wrapper">
        <div className="portfolio-container">
          <div className="portfolio-section">
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              <p>Student request not found.</p>
              <button
                className="profile2-request-evaluation-button"
                onClick={() => navigate('/profile3')}
                style={{ marginTop: '20px' }}
              >
                Back to Requests
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrapper">
      {/* Header */}
      <div className="portfolio-container">
        <div className="portfolio-section" style={{ textAlign: 'left' }}>
          <div className="student-request-header-info" style={{ textAlign: 'left', width: '100%' }}>
            <h2 className="portfolio-section-title" style={{ margin: 0, textAlign: 'left', width: '100%' }}>
              {selectedRequest.studentName}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px', paddingLeft: 0, textAlign: 'left', width: '100%' }}>
              Requested: {formatDate(selectedRequest.requestedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Display Section */}
      <div className="portfolio-container">
        <div className="portfolio-section">
          <h2 className="portfolio-section-title">Student Portfolio</h2>
          <div className="portfolio-display-box profile3-student-portfolio-box">
            <div className="portfolio-file-display">
              <div className="portfolio-file-icon">
                {React.createElement(PdfIcon)}
              </div>
              <div className="portfolio-file-info">
                <p className="portfolio-file-name">{selectedRequest.portfolioFileName}</p>
                <p className="portfolio-file-meta">PDF Document</p>
              </div>
              <button
                className="portfolio-view-button"
                onClick={() => void handleOpenPortfolio()}
              >
                View Portfolio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Results Section - AI, Student, Teacher (only Teacher editable) */}
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
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {!isStudent && !isCompletedView && (
                <button
                  className={`profile2-request-evaluation-button ${
                    hasUnsavedTeacherChanges
                      ? 'profile2-save-evaluation-button-active'
                      : 'profile2-save-evaluation-button-idle'
                  }`}
                  type="button"
                  disabled={!hasUnsavedTeacherChanges || isSavingEvaluation || isSubmitting}
                  onClick={() => void handleSaveTeacherEvaluation()}
                >
                  {isSavingEvaluation ? 'Saving...' : 'Save Evaluation'}
                </button>
              )}
            </div>
          </div>

          {isLoadingRubric ? (
            <div className="evaluation-content">
              <p className="evaluation-message">Loading rubric...</p>
            </div>
          ) : !selectedRubricData ? (
            <div className="evaluation-content">
              <p className="evaluation-message">No evaluation results available yet.</p>
              <p className="evaluation-submessage">
                Select and confirm a rubric score to see evaluation results.
              </p>
            </div>
          ) : skills.length === 0 ? (
            <div className="evaluation-content">
              <p className="evaluation-message">No skills available for this rubric.</p>
            </div>
          ) : (
            <>
              <div className={`skills-panels-container ${evaluationPanelsGridClass}`}>
                  <div className="skills-panel profile2-panel">
                    <h2 className="panel-title">AI</h2>
                    <div className="search-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search skills"
                        value={searchAi}
                        onChange={(e) => setSearchAi(e.target.value)}
                      />
                      {searchAi && (
                        <button className="clear-search" onClick={() => setSearchAi('')}>
                          {React.createElement(CloseIcon)}
                        </button>
                      )}
                    </div>
                    <div className="skills-list">
                      {filteredAiSkills.map((skill, index) => (
                        <div key={index} className="skill-item profile2-skill-item">
                          <span className="skill-name">{skill.skillArea}</span>
                          <input
                            type="text"
                            className="profile2-score-input ai-score-input"
                            value={
                              (() => {
                                const raw = aiEvaluations[skill.skillArea];
                                if (typeof raw !== 'string' || raw.trim() === '') return '-';
                                return toRubricLevelLabel(raw) || '-';
                              })()
                            }
                            readOnly
                            placeholder="-"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {(isStudent || (isTeacher && isCompletedView)) && (
                  <div className="skills-panel profile2-panel">
                    <h2 className="panel-title">Student</h2>
                    <div className="search-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search skills"
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                      />
                      {searchStudent && (
                        <button className="clear-search" onClick={() => setSearchStudent('')}>
                          {React.createElement(CloseIcon)}
                        </button>
                      )}
                    </div>
                    <div className="skills-list">
                      {filteredStudentSkills.map((skill, index) => (
                        <div
                          key={index}
                          className={`skill-item profile2-skill-item ${
                            shouldDashStudentRowsForTeacher
                              ? 'profile3-student-skill-pending-self-eval'
                              : ''
                          }`}
                        >
                          <span className="skill-name">{skill.skillArea}</span>
                          <input
                            type="text"
                            className="profile2-score-input ai-score-input"
                            value={(() => {
                              const raw = (studentEvaluations[skill.skillArea] || '').trim();
                              // In teacher view before student self-evaluation, legacy 0-values
                              // should render as blank instead of "No Passing Criteria".
                              if (shouldDashStudentRowsForTeacher && (raw === '' || raw === '0')) {
                                return '-';
                              }
                              return toRubricLevelLabel(raw);
                            })()}
                            readOnly
                            placeholder="—"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                  {(!isStudent || isCompletedView) && (
                  <div className="skills-panel profile2-panel">
                    <h2 className="panel-title">Teacher</h2>
                    <div className="search-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search skills"
                        value={searchTeacher}
                        onChange={(e) => setSearchTeacher(e.target.value)}
                      />
                      {searchTeacher && (
                        <button className="clear-search" onClick={() => setSearchTeacher('')}>
                          {React.createElement(CloseIcon)}
                        </button>
                      )}
                    </div>
                    <div className="skills-list">
                      {filteredTeacherSkills.map((skill, index) => {
                        const isCustomTeacherSkill = !rubricSkillAreaSet.has(
                          skill.skillArea.trim()
                        );
                        const rawTeacherScore = teacherScores[skill.skillArea] ?? '';
                        const teacherSelectValue = isCustomTeacherSkill
                          ? /^\d+$/.test(rawTeacherScore.trim())
                            ? rawTeacherScore.trim()
                            : '0'
                          : rawTeacherScore;
                        return (
                        <div key={index} className="skill-item profile2-skill-item profile2-skill-item-deletable">
                          {!isCompletedView &&
                            isCustomTeacherSkill && (
                              <button
                                type="button"
                                className="profile2-skill-delete-button"
                                title="Remove skill"
                                aria-label="Remove skill"
                                onClick={() => handleDeleteTeacherCustomSkill(skill.skillArea)}
                              >
                                {React.createElement(CloseIcon)}
                              </button>
                            )}
                          {!isCompletedView &&
                          isCustomTeacherSkill ? (
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
                              onBlur={(e) => handleRenameTeacherCustomSkill(skill.skillArea, e.target.value)}
                            />
                          ) : (
                            <span className="skill-name">{skill.skillArea}</span>
                          )}
                          {isCompletedView ? (
                            <input
                              type="text"
                              className="profile2-score-input teacher-score-input"
                              value={toRubricLevelLabel(teacherScores[skill.skillArea] || '')}
                              readOnly
                              placeholder="—"
                            />
                          ) : (
                            <select
                              className="profile2-score-input teacher-score-input"
                              value={teacherSelectValue}
                              onChange={(e) => handleScoreChange(skill.skillArea, e.target.value)}
                            >
                              <option value="0">No Passing Criteria</option>
                              {!isCustomTeacherSkill && <option value="">-</option>}
                              {rubricLevelOptions.map((level) => (
                                <option key={level.value} value={level.value}>
                                  {level.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        );
                      })}
                      {!isCompletedView && (
                        <div
                          className="rubric-score-add-box"
                          onClick={handleAddTeacherSkill}
                          title="Add Skill"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleAddTeacherSkill();
                            }
                          }}
                        >
                          <span className="rubric-score-add-box-spacer"></span>
                          <button
                            className="rubric-score-add-box-button"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddTeacherSkill();
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
              </div>
              </>
            )}
        </div>
      </div>
      
      {/* Back Button - Outside evaluation container, as direct child of profile-wrapper */}
      <div className="profile3-back-button-container">
        <button
          className="profile3-back-button"
          onClick={() => navigate('/profile3')}
        >
          <span className="back-button-icon">
            {React.createElement(ArrowLeftIcon)}
          </span>
          <span>Back to Evaluation Main Page</span>
        </button>
        {!isStudent && !isCompletedView && (
        <button
          className="profile2-request-evaluation-button"
          type="button"
          onClick={handleSubmitEvaluation}
          disabled={
            isSubmitting || isSavingEvaluation || !allTeacherScoresFilled
          }
        >
          {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
        </button>
        )}
      </div>

      {/* Rubric info modal - view only */}
      {isRubricInfoOpen && (
        <div className="modal-overlay" onClick={handleCloseRubricInfo}>
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
                          <td key={valueIndex} className="evaluation-table-cell">
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
                className="modal-button modal-button-apply"
                onClick={handleEditRubricFromInfo}
              >
                Edit Rubric Score
              </button>
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
                            portfolioUsedFileName: selectedRequest?.portfolioFileName || 'portfolio.pdf',
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

export default Profile3Detail;
