import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import './Profile.css';
import './RubricScore.css';
import { AiOutlineClose, AiOutlineDelete, AiOutlineInfoCircle, AiOutlinePlus } from 'react-icons/ai';
import { FaBriefcase } from 'react-icons/fa';
import { evaluatePortfolio, importPortfolio } from '../services/portfolioApi';
import { getRubricScores, getRubricScore, RubricScoreDetail } from '../services/rubricScoreApi';
import RubricScoreTable from './RubricScoreTable';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/index';
import { useAppRole } from '../context/AppRoleContext';

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

const Profile2: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isStudent, isTeacher } = useAppRole();
  const evaluationPanelsGridClass =
    isStudent || isTeacher ? 'profile2-two-panels' : 'profile2-three-panels';
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
  const [isStudentEditMode, setIsStudentEditMode] = useState<boolean>(false);
  const [originalStudentSkills, setOriginalStudentSkills] = useState<Skill[]>([]);
  const [originalStudentEvaluations, setOriginalStudentEvaluations] = useState<{ [skillArea: string]: string }>({});
  /** Baseline AI scores when student entered edit mode (for cancel / done without save). */
  const [originalAiEvaluations, setOriginalAiEvaluations] = useState<{ [skillArea: string]: string }>({});
  /** Student: AI run results before Save (committed to aiEvaluations on Save only). */
  const [draftAiEvaluations, setDraftAiEvaluations] = useState<{ [skillArea: string]: string } | null>(null);
  const [extractedPortfolioText, setExtractedPortfolioText] = useState<string>('');
  const [isAiEvaluating, setIsAiEvaluating] = useState<boolean>(false);

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
        
        setTeacherEvaluations(newTeacherValues);
        setAiEvaluations(newAiValues);
        setStudentEvaluations(newStudentValues);
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
  }, [confirmedRubricId, uploadedFiles.length]);

  /** Manual AI evaluation — avoids surprise API calls and re-runs on every state tick. */
  const runAiEvaluation = useCallback(async () => {
    if (!confirmedRubricId || !selectedRubricData || !extractedPortfolioText.trim()) return;
    // Only students use this (teachers have no Evaluate with AI button); results stay draft until Save.
    if (!isStudent || !isStudentEditMode) return;

    try {
      setIsAiEvaluating(true);

      const [skillsRes, levelsRes, evalRes] = await Promise.all([
        api.get<BackendRubricSkill[]>(`rubric/${confirmedRubricId}/rubric_skills`),
        api.get<BackendLevel[]>(`rubric/${confirmedRubricId}/levels`),
        evaluatePortfolio(extractedPortfolioText, confirmedRubricId, uploadedFiles[0]?.name || 'portfolio.pdf'),
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

      const nextAiEvaluations: { [skillArea: string]: string } = {};
      selectedRubricData.rows.forEach((row) => {
        nextAiEvaluations[row.skillArea] = '';
      });

      evalRes.evaluations.forEach((item) => {
        const rowKey = rubricSkillIdToRowKey.get(item.rubric_skill_id);
        const levelRank = levelIdToRank.get(item.level_id);
        if (!rowKey || !levelRank) return;
        nextAiEvaluations[rowKey] = String(levelRank);
      });

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
    isStudentEditMode,
  ]);

  const canRunAiEvaluation =
    !!confirmedRubricId &&
    !!selectedRubricData &&
    extractedPortfolioText.trim().length > 0 &&
    !isAiEvaluating;

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
    setDraftAiEvaluations(null);
    setIsStudentEditMode(false);
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
    fileInputRef.current?.click();
  };

  const clearPortfolioFile = useCallback(() => {
    setUploadedFiles([]);
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
    if (!uploadedFiles.length) return;
    if (!window.confirm('Remove the uploaded portfolio file?')) return;
    clearPortfolioFile();
  };

  const handleDeleteEvaluation = () => {
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
    navigate('/profile2', { state: { removeEvaluationId: evaluationId } });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    setSelectedRubricId(rubricId);
  };

  const handleConfirmRubric = () => {
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

  /** Student in edit mode: preview AI run before Save; otherwise show saved AI scores. */
  const aiEvaluationsForDisplay = useMemo(() => {
    if (isStudent && isStudentEditMode && draftAiEvaluations) {
      return draftAiEvaluations;
    }
    return aiEvaluations;
  }, [isStudent, isStudentEditMode, draftAiEvaluations, aiEvaluations]);

  const isConfirmDisabled =
    !selectedRubricId || selectedRubricId === confirmedRubricId;
  const hasSelectedPortfolio = uploadedFiles.length > 0;
  const hasSelectedRubric = !!confirmedRubricId;

  const handleEnterStudentEditMode = () => {
    setOriginalStudentSkills(studentSkills.map((s) => ({ ...s })));
    setOriginalStudentEvaluations({ ...studentEvaluations });
    setOriginalAiEvaluations({ ...aiEvaluations });
    setDraftAiEvaluations(null);
    setIsStudentEditMode(true);
  };

  const handleSaveStudentEdits = () => {
    let committedAi = aiEvaluations;
    if (draftAiEvaluations !== null) {
      committedAi = { ...draftAiEvaluations };
      setAiEvaluations(committedAi);
      setDraftAiEvaluations(null);
    }
    setOriginalStudentSkills(studentSkills.map((s) => ({ ...s })));
    setOriginalStudentEvaluations({ ...studentEvaluations });
    setOriginalAiEvaluations({ ...committedAi });
  };

  const handleCancelStudentEdits = () => {
    setStudentSkills(originalStudentSkills.map((s) => ({ ...s })));
    setStudentEvaluations({ ...originalStudentEvaluations });
    setAiEvaluations({ ...originalAiEvaluations });
    setDraftAiEvaluations(null);
    setIsStudentEditMode(false);
  };

  const handleDoneStudentEditing = () => {
    if (draftAiEvaluations !== null) {
      setAiEvaluations({ ...originalAiEvaluations });
      setDraftAiEvaluations(null);
    }
    setIsStudentEditMode(false);
  };

  const handleAddStudentSkill = () => {
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
    setStudentExtraSkills((prev) => prev.filter((s) => s.skillArea !== skillArea));
    setStudentEvaluations((prev) => {
      const next = { ...prev };
      delete next[skillArea];
      return next;
    });
  };

  const handleRenameStudentCustomSkill = (oldSkillArea: string, nextSkillAreaRaw: string) => {
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
            >
              <span className="profile2-upload-icon">
                {React.createElement(BriefcaseIcon)}
              </span>
              <span className="profile2-upload-label">
                {uploadedFiles[0]?.name || 'Upload File'}
              </span>
            </button>

            {isStudent && uploadedFiles.length > 0 && (
              <button
                type="button"
                className="profile2-remove-file-button"
                title="Remove uploaded file"
                aria-label="Remove uploaded file"
                onClick={handleRemoveUploadedFile}
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
                  cursor: 'pointer',
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
            disabled={isConfirmDisabled}
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
              {isStudent && isStudentEditMode && (
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
                  disabled={!confirmedRubricId || !selectedRubricData}
                  onClick={() => {
                    // Handle request teacher evaluation (placeholder)
                    console.log('Request Teacher Evaluation clicked');
                  }}
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
                  {isStudent && isStudentEditMode && draftAiEvaluations && (
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
                          value={aiEvaluationsForDisplay[skill.skillArea] || ''}
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
                        {isStudentEditMode &&
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
                        {isStudentEditMode &&
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
                        <input
                          type="text"
                          className="profile2-score-input student-score-input"
                          value={studentEvaluations[skill.skillArea] || ''}
                          readOnly={!isStudentEditMode}
                          onChange={
                            !isStudentEditMode
                              ? undefined
                              : (e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d+$/.test(value)) {
                                    setStudentEvaluations(prev => ({
                                      ...prev,
                                      [skill.skillArea]: value
                                    }));
                                  }
                                }
                          }
                          onBlur={
                            !isStudentEditMode
                              ? undefined
                              : (e) => {
                                  const value = e.target.value;
                                  if (value && (!/^\d+$/.test(value) || parseInt(value) < 1)) {
                                    setStudentEvaluations(prev => ({
                                      ...prev,
                                      [skill.skillArea]: ''
                                    }));
                                  }
                                }
                          }
                          placeholder="Score"
                        />
                      </div>
                    ))}
                    {isStudentEditMode && (
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
                {!isStudent && (
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
                          value={teacherEvaluations[skill.skillArea] || ''}
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
                {!isStudentEditMode ? (
                  <button
                    className="profile2-request-evaluation-button"
                    type="button"
                    onClick={handleEnterStudentEditMode}
                    disabled={!confirmedRubricId || !selectedRubricData}
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      className="profile2-request-evaluation-button"
                      type="button"
                      onClick={handleCancelStudentEdits}
                    >
                      Cancel
                    </button>
                    <button
                      className="profile2-request-evaluation-button"
                      type="button"
                      onClick={handleSaveStudentEdits}
                    >
                      Save
                    </button>
                    <button
                      className="profile2-request-evaluation-button"
                      type="button"
                      onClick={handleDoneStudentEditing}
                    >
                      Done Editing
                    </button>
                  </>
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
