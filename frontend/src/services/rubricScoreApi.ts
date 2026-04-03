import api from '../api/index';
import { getApiErrorDetail } from '../utils/apiErrors';

export interface TableData {
  skillArea: string;
  values: string[];
}

export interface RubricScoreDetail {
  id: string;
  title: string;
  headers: string[];
  rows: TableData[];
}

export interface RubricScoreListItem {
  id: string;
  title: string;
}

interface BackendRubric {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface BackendRubricSkill {
  id: number;
  rubric_id: number;
  display_order: number;
  name:string;
}

interface BackendLevel {
  id: number;
  rubric_id: number;
  rank: number;
  description: string | null; // Backend may return null for description
}

interface BackendCriteria {
  id: number;
  rubric_skill_id: number;
  level_id: number;
  description: string;
}

export const getRubricScores = async (): Promise<RubricScoreListItem[]> => {
  try {
    const response = await api.get<BackendRubric[]>('rubric/');
    
    return response.data.map((item) => ({
      id: String(item.id),
      title: item.name || 'Untitled Rubric',
    }));
  } catch (error: unknown) {
    console.error('Error fetching rubric scores:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to fetch rubric scores');
  }
};

const fetchRubricData = async (rubricId: number) => {
  // Get skills using the correct endpoint
  try {
    const skillsResponse = await api.get<BackendRubricSkill[]>(`rubric/${rubricId}/rubric_skills`);
    const skills = skillsResponse.data;

    // Get levels using the new endpoint
    try {
      // Backend may return 500 if levels have null descriptions, so we'll catch and handle it
      const levelsResponse = await api.get<BackendLevel[]>(`rubric/${rubricId}/levels`);
      const levels = levelsResponse.data;
      // Filter out any levels with null descriptions or handle them gracefully
      const validLevels = levels.map(level => ({
        ...level,
        description: level.description === null || level.description === undefined 
          ? `Level ${level.rank}` 
          : level.description
      }));

      // Get criteria using the new endpoint
      try {
        const criteriaResponse = await api.get<BackendCriteria[]>(`rubric/${rubricId}/criteria`);
        const criteria = criteriaResponse.data;

        return { skills, levels: validLevels, criteria };
      } catch (error) {
        return { skills, levels: validLevels, criteria: [] };
      }
    } catch (error) {
      // If the error is a 500 due to validation (null descriptions), try to continue
      // by returning empty levels - the frontend can work with skills only
      return { skills, levels: [], criteria: [] };
    }
  } catch (error) {
    return { skills: [], levels: [], criteria: [] };
  }
};

const transformBackendToFrontend = (
  rubric: BackendRubric,
  skills: BackendRubricSkill[],
  levels: BackendLevel[],
  criteria: BackendCriteria[]
): RubricScoreDetail => {
  const sortedLevels = [...levels].sort((a, b) => a.rank - b.rank);
  const sortedSkills = [...skills].sort((a, b) => a.display_order - b.display_order);

  // Use level descriptions from backend
  // Handle None/null descriptions from backend gracefully
  let headers: string[];
  if (sortedLevels.length > 0) {
    headers = sortedLevels.map((level) => {
      // Handle None/null/undefined descriptions
      const desc = level.description;
      if (desc === null || desc === undefined || desc === 'None') {
        return `Level ${level.rank}`; // Fallback to "Level 1", "Level 2", etc.
      }
      return desc || `Level ${level.rank}`;
    });
  } else {
    headers = [];
  }

  const rows: TableData[] = sortedSkills.map((skill, index) => {
    const skillCriteria = criteria.filter((c) => c.rubric_skill_id === skill.id);
    // If levels are empty, create empty values array (still create the row for the skill)
    const values = sortedLevels.length > 0 
      ? sortedLevels.map((level) => {
          const criterion = skillCriteria.find((c) => c.level_id === level.id);
          return criterion ? criterion.description : '';
        })
      : []; // Empty array if no levels
    return {
      skillArea: skill.name || '',
      values,
    };
  });

  return {
    id: String(rubric.id),
    title: rubric.name || 'Untitled Rubric',
    headers,
    rows,
  };
};

export const getRubricScore = async (id: string): Promise<RubricScoreDetail> => {
  try {
    // Get the rubric
    const rubricResponse = await api.get<BackendRubric>(`rubric/${id}`);
    const rubric = rubricResponse.data;
    
    // Get skills, levels, and criteria using the new endpoints
    // This will return empty arrays for levels/criteria if they fail to load
    const { skills, levels, criteria } = await fetchRubricData(rubric.id);
    
    // A rubric may intentionally have only level headers before skills are added.
    // Preserve headers from backend levels even when no skills exist.
    if (skills.length === 0) {
      console.warn('No skills found for this rubric. Preserving level headers.');
    }
    
    // If we have no levels, log a warning but continue (skills are more important)
    if (levels.length === 0) {
      console.warn('No levels found for this rubric. Continuing with skills only.');
    }
    
    // Transform backend data to frontend format.
    // This also supports: levels-only rubric (headers with zero rows).
    return transformBackendToFrontend(rubric, skills, levels, criteria);
  } catch (error: unknown) {
    console.error('Error fetching rubric score:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to fetch rubric score');
  }
};

export const createRubricScore = async (
  rubricScore: Omit<RubricScoreDetail, 'id'>
): Promise<RubricScoreDetail> => {
  try {
    const now = new Date().toISOString();
    
    const rubricPayload = {
      name: rubricScore.title,
      created_at: now,
      updated_at: now,
    };
    
    const rubricResponse = await api.post<BackendRubric>('rubric/', rubricPayload);
    const rubric = rubricResponse.data;

    const rubricId = rubric.id;
    const createdSkills: BackendRubricSkill[] = [];
    const createdLevels: BackendLevel[] = [];
    const createdCriteria: BackendCriteria[] = [];

    for (let i = 0; i < rubricScore.headers.length; i++) {
      // Ensure description is always a valid string (not null, undefined, or empty)
      const headerValue = rubricScore.headers[i];
      const description = (headerValue && headerValue.trim() !== '') 
        ? headerValue.trim() 
        : `Level ${i + 1}`; // Fallback to "Level 1", "Level 2", etc.
      
      const levelPayload = {
        rubric_id: rubricId,
        rank: i + 1,
        description: description,
      };
      
      try {
        const levelResponse = await api.post<BackendLevel>('level/', levelPayload);
        const level = levelResponse.data;
        createdLevels.push(level);
      } catch (error: any) {
        console.error(`Failed to create level ${i + 1}:`, error.response?.data || error.message);
      }
    }

    for (let i = 0; i < rubricScore.rows.length; i++) {
      const skillPayload = {
        rubric_id: rubricId,
        display_order: i + 1,
        name: rubricScore.rows[i].skillArea,
      };
      
      try {
        const skillResponse = await api.post<BackendRubricSkill>('rubric_skill/', skillPayload);
        const skill = skillResponse.data;
        createdSkills.push(skill);

        for (let j = 0; j < rubricScore.rows[i].values.length; j++) {
          if (rubricScore.rows[i].values[j].trim()) {
            const criteriaPayload = {
              rubric_skill_id: skill.id,
              level_id: createdLevels[j].id,
              description: rubricScore.rows[i].values[j].trim(),
            };
            
            try {
              const criteriaResponse = await api.post<BackendCriteria>('criteria/', criteriaPayload);
              const criteria = criteriaResponse.data;
              createdCriteria.push(criteria);
            } catch (error: any) {
              console.error(`Failed to create criteria for skill ${i + 1}, level ${j + 1}:`, error.response?.data || error.message);
            }
          }
        }
      } catch (error: any) {
        console.error(`Failed to create skill ${i + 1}:`, error.response?.data || error.message);
      }
    }

    const { skills, levels, criteria } = await fetchRubricData(rubricId);
    
    if (skills.length === 0 && levels.length === 0) {
      return {
        id: String(rubric.id),
        title: rubric.name,
        headers: rubricScore.headers,
        rows: rubricScore.rows,
      };
    }
    
    return transformBackendToFrontend(rubric, skills, levels, criteria);
  } catch (error: unknown) {
    console.error('Error creating rubric score:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to create rubric score');
  }
};

export const updateRubricName = async (
  id: string,
  name: string
): Promise<BackendRubric> => {
  try {
    // Backend expects full RubricScoreBase: { name, created_at, updated_at }
    // So we first fetch the existing rubric to preserve created_at.
    const existingRes = await api.get<BackendRubric>(`rubric/${id}`);
    const existing = existingRes.data;

    const now = new Date().toISOString();
    const payload = {
      name: name,
      created_at: existing.created_at,
      updated_at: now,
    };

    const response = await api.put<BackendRubric>(`rubric/${id}`, payload);
    return response.data;
  } catch (error: unknown) {
    console.error('Error updating rubric name:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to update rubric name');
  }
};

export const updateRubricScore = async (
  id: string,
  rubricScore: Omit<RubricScoreDetail, 'id'>
): Promise<RubricScoreDetail> => {
  try {
    const rubricId = parseInt(id);
    if (isNaN(rubricId)) {
      throw new Error(`Invalid rubric ID: ${id}`);
    }

    // First, update rubric name. If this fails, stop and surface the error.
    await updateRubricName(id, rubricScore.title);

    // Strictly replace rubric internals to avoid duplicates on revisit.
    const [skillsResponse, levelsResponse, criteriaResponse] = await Promise.all([
      api.get<BackendRubricSkill[]>(`rubric/${rubricId}/rubric_skills`),
      api.get<BackendLevel[]>(`rubric/${rubricId}/levels`),
      api.get<BackendCriteria[]>(`rubric/${rubricId}/criteria`),
    ]);
    const existingSkills = skillsResponse.data;
    const existingLevels = levelsResponse.data;
    const existingCriteria = criteriaResponse.data;

    // Delete criteria first, then skills/levels.
    for (const c of existingCriteria) {
      await api.delete(`criteria/${c.id}`);
    }
    for (const s of existingSkills) {
      await api.delete(`rubric_skill/${s.id}`);
    }
    for (const l of existingLevels) {
      await api.delete(`level/${l.id}`);
    }

    const createdSkills: BackendRubricSkill[] = [];
    const createdLevels: BackendLevel[] = [];
    const createdCriteria: BackendCriteria[] = [];

    // Create new levels for each header
    for (let i = 0; i < rubricScore.headers.length; i++) {
      // Ensure description is always a valid string (not null, undefined, or empty)
      const headerValue = rubricScore.headers[i];
      const description = (headerValue && headerValue.trim() !== '') 
        ? headerValue.trim() 
        : `Level ${i + 1}`; // Fallback to "Level 1", "Level 2", etc.
      
      const levelPayload = {
        rubric_id: rubricId,
        rank: i + 1,
        description: description,
      };
      
      try {
        const levelResponse = await api.post<BackendLevel>('level/', levelPayload);
        const level = levelResponse.data;
        createdLevels.push(level);
      } catch (error: any) {
        console.error(`Failed to create level ${i + 1}:`, error.response?.data || error.message);
        throw new Error(`Failed to create level ${i + 1}: ${getApiErrorDetail(error)}`);
      }
    }

    // Create new skills for each row
    // Ensure we have levels before creating skills
    if (createdLevels.length === 0 && rubricScore.headers.length > 0) {
      throw new Error('Failed to create levels. Cannot create skills without levels.');
    }
    
    for (let i = 0; i < rubricScore.rows.length; i++) {
      const skillPayload = {
        rubric_id: rubricId,
        display_order: i + 1,
        name: rubricScore.rows[i].skillArea,
      };
      
      let skill: BackendRubricSkill;
      try {
        const skillResponse = await api.post<BackendRubricSkill>('rubric_skill/', skillPayload);
        skill = skillResponse.data;
        createdSkills.push(skill);
      } catch (error: any) {
        console.error(`Failed to create skill ${i + 1}:`, error.response?.data || error.message);
        throw new Error(`Failed to create skill ${i + 1}: ${getApiErrorDetail(error)}`);
      }

      // Create criteria for each cell value (save ALL cells, including empty ones)
      for (let j = 0; j < Math.max(rubricScore.rows[i].values.length, createdLevels.length); j++) {
        // Skip if we don't have a level for this column
        if (j >= createdLevels.length) {
          continue;
        }
        
        // Save all cells, even if empty, to preserve all user edits
        const cellValue = (rubricScore.rows[i].values[j] || '').trim();
        const criteriaPayload = {
          rubric_skill_id: skill.id,
          level_id: createdLevels[j].id,
          description: cellValue,
        };
        
        try {
          const criteriaResponse = await api.post<BackendCriteria>('criteria/', criteriaPayload);
          const criteria = criteriaResponse.data;
          createdCriteria.push(criteria);
        } catch (error: any) {
          console.error(
            `Failed to create criteria for skill ${skill.id}, level ${createdLevels[j].id}:`,
            error.response?.data || error.message
          );
          throw new Error(
            `Failed to create criteria for skill ${skill.id}, level ${createdLevels[j].id}: ${getApiErrorDetail(error)}`
          );
        }
      }
    }

    // Return canonical backend state after save.
    return await getRubricScore(id);
  } catch (error: unknown) {
    console.error('Error updating rubric score:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to update rubric score');
  }
};

export const deleteRubricScore = async (id: string): Promise<void> => {
  try {
    await api.delete(`rubric/${id}`);
  } catch (error: unknown) {
    console.error('Error deleting rubric score:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to delete rubric score');
  }
};

// --- Rubric snapshot history (backend snapshots) ---
export interface BackendRubricScoreHistory {
  id: number;
  created_at: string;
  expired_at: string | null;
  status: string; // valid, outdated, expired
  rubric_score_id: number;
}

interface BackendRubricSkillHistory {
  id: number;
  rubric_history_id: number;
  name: string;
  display_order: number;
  created_at: string;
}

interface BackendLevelHistory {
  id: number;
  rubric_history_id: number;
  rank: number;
  description: string | null;
  created_at: string;
}

interface BackendCriteriaHistory {
  id: number;
  rubric_skill_history_id: number;
  level_history_id: number;
  description: string | null;
  created_at: string;
}

export interface RubricHistorySnapshot {
  headers: string[];
  rows: { skillArea: string; values: string[] }[];
}

interface CreateRubricHistoryPayload {
  rubric_score_id: number;
  status?: string;
  expired_at?: string;
}

interface UpdateRubricHistoryPayload {
  status?: string;
  expired_at?: string;
}

export const getRubricScoreHistoryByRubric = async (
  rubricId: string
): Promise<BackendRubricScoreHistory[]> => {
  try {
    const rubricHistory = await api.get<BackendRubricScoreHistory[]>(
      `rubric_score_history/by_rubric/${rubricId}`
    );
    return rubricHistory.data || [];
  } catch (error: unknown) {
    console.error('Error fetching rubric score history by rubric:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to fetch rubric score history');
  }
};

// Fetch one snapshot table (headers + values) from backend.
export const getRubricScoreHistorySnapshot = async (
  rubricHistoryId: number
): Promise<RubricHistorySnapshot> => {
  try {
    const [skillsRes, levelsRes, criteriaRes] = await Promise.all([
      api.get<BackendRubricSkillHistory[]>(
        `rubric_score_history/${rubricHistoryId}/rubric_skills`
      ),
      api.get<BackendLevelHistory[]>(
        `rubric_score_history/${rubricHistoryId}/levels`
      ),
      api.get<BackendCriteriaHistory[]>(
        `rubric_score_history/${rubricHistoryId}/criteria`
      ),
    ]);

    const skills = skillsRes.data || [];
    const levels = levelsRes.data || [];
    const criteria = criteriaRes.data || [];

    const sortedLevels = [...levels].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    const headers = sortedLevels.map((lv) => {
      const desc = lv.description;
      if (desc === null || desc === undefined || desc === 'None' || String(desc).trim() === '') {
        return `Level ${lv.rank}`;
      }
      return desc;
    });

    const criteriaBySkillAndLevel: Record<string, string> = {};
    for (const c of criteria) {
      const key = `${c.rubric_skill_history_id}:${c.level_history_id}`;
      criteriaBySkillAndLevel[key] = c.description ?? '';
    }

    const sortedSkills = [...skills].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );

    const rows = sortedSkills.map((skill) => {
      const values = sortedLevels.map((lv) => {
        const key = `${skill.id}:${lv.id}`;
        return criteriaBySkillAndLevel[key] ?? '';
      });
      return {
        skillArea: skill.name || '',
        values,
      };
    });

    return { headers, rows };
  } catch (error: unknown) {
    console.error('Error fetching rubric score history snapshot:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to fetch rubric score history snapshot');
  }
};

export const createRubricScoreHistoryWithExpiration = async (
  rubricId: string,
  expiredAtIso: string
): Promise<BackendRubricScoreHistory> => {
  const parsedRubricId = Number(rubricId);
  if (!Number.isInteger(parsedRubricId) || parsedRubricId <= 0) {
    throw new Error(`Invalid rubric id: ${rubricId}`);
  }
  if (!expiredAtIso || Number.isNaN(new Date(expiredAtIso).getTime())) {
    throw new Error('Invalid expiration datetime');
  }

  try {
    const payload: CreateRubricHistoryPayload = {
      rubric_score_id: parsedRubricId,
      status: 'valid',
      expired_at: expiredAtIso,
    };
    const res = await api.post<BackendRubricScoreHistory>('rubric_score_history/', payload);
    return res.data;
  } catch (error: unknown) {
    console.error('Error creating rubric score history with expiration:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to set rubric expiration');
  }
};

export const updateRubricScoreHistoryExpiration = async (
  rubricHistoryId: number,
  expiredAtIso: string
): Promise<BackendRubricScoreHistory> => {
  if (!Number.isInteger(rubricHistoryId) || rubricHistoryId <= 0) {
    throw new Error(`Invalid rubric history id: ${rubricHistoryId}`);
  }
  if (!expiredAtIso || Number.isNaN(new Date(expiredAtIso).getTime())) {
    throw new Error('Invalid expiration datetime');
  }

  try {
    const payload: UpdateRubricHistoryPayload = { expired_at: expiredAtIso };
    const res = await api.put<BackendRubricScoreHistory>(
      `rubric_score_history/${rubricHistoryId}`,
      payload
    );
    return res.data;
  } catch (error: unknown) {
    console.error('Error updating rubric history expiration:', error);
    throw new Error(getApiErrorDetail(error) || 'Failed to update rubric history expiration');
  }
};

