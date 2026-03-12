import api from '../api/index';

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
  } catch (error: any) {
    console.error('Error fetching rubric scores:', error);
    const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch rubric scores';
    throw new Error(errorMessage);
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
  criteria: BackendCriteria[],
  savedHeaders?: string[],
  savedSkillAreas?: string[]
): RubricScoreDetail => {
  const sortedLevels = [...levels].sort((a, b) => a.rank - b.rank);
  const sortedSkills = [...skills].sort((a, b) => a.display_order - b.display_order);

  // Use saved headers if available, otherwise use level descriptions from backend
  // Handle None/null descriptions from backend gracefully
  let headers: string[];
  if (savedHeaders && savedHeaders.length === sortedLevels.length) {
    headers = [...savedHeaders];
  } else if (sortedLevels.length > 0) {
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
      skillArea: savedSkillAreas && savedSkillAreas[index] !== undefined
        ? savedSkillAreas[index]
        : (skill.name || ''),
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
    
    // If we have no skills, return empty rubric structure instead of throwing
    // This allows the UI to show the rubric exists but has no skills yet
    if (skills.length === 0) {
      console.warn('No skills found for this rubric. Returning empty rubric structure.');
      return {
        id: String(rubric.id),
        title: rubric.name || 'Untitled Rubric',
        headers: [],
        rows: [],
      };
    }
    
    // If we have no levels, log a warning but continue (skills are more important)
    if (levels.length === 0) {
      console.warn('No levels found for this rubric. Continuing with skills only.');
    }
    
    // Try to get saved headers and skillAreas from localStorage (metadata not stored in backend)
    let savedHeaders: string[] | undefined;
    let savedSkillAreas: string[] | undefined;
    try {
      const savedDataStr = localStorage.getItem(`rubric_metadata_${id}`);
      if (savedDataStr) {
        const savedData = JSON.parse(savedDataStr);
        const age = Date.now() - savedData.timestamp;
        // Use saved metadata if it's recent (within 30 days)
        if (age < 30 * 24 * 60 * 60 * 1000) {
          savedHeaders = savedData.headers;
          savedSkillAreas = savedData.skillAreas;
        }
      }
    } catch (error) {
      console.warn('Failed to load metadata from localStorage:', error);
    }
    
    // Transform backend data to frontend format, including saved metadata
    // This will work even with empty levels - rows will be created from skills
    return transformBackendToFrontend(rubric, skills, levels, criteria, savedHeaders, savedSkillAreas);
  } catch (error: any) {
    console.error('Error fetching rubric score:', error);
    const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch rubric score';
    throw new Error(errorMessage);
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
  } catch (error: any) {
    console.error('Error creating rubric score:', error);
    const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to create rubric score';
    throw new Error(errorMessage);
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
  } catch (error: any) {
    console.error('Error updating rubric name:', error);
    const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to update rubric name';
    throw new Error(errorMessage);
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

    // First, update the rubric name if it changed
    try {
      await updateRubricName(id, rubricScore.title);
    } catch (error) {
      // Continue even if name update fails
    }

    // Delete existing skills and levels to avoid duplicates
    // First, get existing skills for this rubric
    const deletionPromises: Promise<void>[] = [];
    
    try {
      const skillsResponse = await api.get<BackendRubricSkill[]>(`rubric/${rubricId}/rubric_skills`);
      const existingSkills = skillsResponse.data;
      
      // Delete each skill (this will cascade delete associated criteria)
      for (const skill of existingSkills) {
        const deletePromise = api.delete(`rubric_skill/${skill.id}`)
          .then(() => {
            // Successfully deleted
          })
          .catch(() => {
            // Silently handle deletion errors
          });
        deletionPromises.push(deletePromise);
      }
    } catch (error) {
      // Continue even if fetch fails
    }

    // Get existing levels using the new endpoint
    try {
      const levelsResponse = await api.get<BackendLevel[]>(`rubric/${rubricId}/levels`);
      const existingLevels = levelsResponse.data;
      // Delete each level (this will cascade delete associated criteria)
      for (const level of existingLevels) {
        const deletePromise = api.delete(`level/${level.id}`)
          .then(() => {
            // Successfully deleted
          })
          .catch(() => {
            // Silently handle deletion errors
          });
        deletionPromises.push(deletePromise);
      }
    } catch (error) {
      // Continue even if fetch fails
    }

    // Wait for all deletions to complete before creating new entries
    if (deletionPromises.length > 0) {
      await Promise.all(deletionPromises);
      // Small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));
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
        throw new Error(`Failed to create level ${i + 1}: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
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
        throw new Error(`Failed to create skill ${i + 1}: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
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
          // Check if it's a unique constraint violation (duplicate entry)
          if (error.response?.status !== 400 && error.response?.status !== 409) {
            // Only log non-duplicate errors
            console.error(`Failed to create criteria for skill ${skill.id}, level ${createdLevels[j].id}:`, error.response?.data || error.message);
          }
          // Continue even if one criteria fails, so other cells can still be saved
        }
      }
    }

    // Use the newly created data directly instead of fetching (to avoid getting old duplicates)
    if (createdSkills.length === 0 && createdLevels.length === 0) {
      return {
        id: id,
        title: rubricScore.title,
        headers: rubricScore.headers,
        rows: rubricScore.rows,
      };
    }
    
    // Build the response using the newly created data, but preserve headers and skillArea from input
    const sortedLevels = [...createdLevels].sort((a, b) => a.rank - b.rank);
    const sortedSkills = [...createdSkills].sort((a, b) => a.display_order - b.display_order);

    // Preserve the headers from input (backend doesn't store header names, only levels)
    const headers = rubricScore.headers.length >= sortedLevels.length
      ? [...rubricScore.headers].slice(0, sortedLevels.length)
      : [...rubricScore.headers, ...Array(sortedLevels.length - rubricScore.headers.length).fill('')];

    // Preserve rows with skillArea and values from input
    const rows: TableData[] = sortedSkills.map((skill, skillIndex) => {
      const skillCriteria = createdCriteria.filter((c) => c.rubric_skill_id === skill.id);
      const values = sortedLevels.map((level, levelIndex) => {
        const criterion = skillCriteria.find((c) => c.level_id === level.id);
        // Use criterion description if exists, otherwise preserve from input
        if (criterion) {
          return criterion.description;
        }
        // Fallback to input value if available
        const inputRow = rubricScore.rows[skillIndex];
        if (inputRow && inputRow.values[levelIndex] !== undefined) {
          return inputRow.values[levelIndex];
        }
        return '';
      });
      
      // Preserve skillArea from input
      const inputRow = rubricScore.rows[skillIndex];
      return {
        skillArea: inputRow ? inputRow.skillArea : '',
        values,
      };
    });

    const result = {
      id: id,
      title: rubricScore.title,
      headers,
      rows,
    };
    
    // Store headers and skillArea in localStorage since they're not stored in backend
    // The actual data (levels, skills, criteria) is now stored in backend and can be fetched
    try {
      const savedData = {
        rubricId: id,
        title: rubricScore.title,
        headers: result.headers,
        skillAreas: result.rows.map(row => row.skillArea),
        timestamp: Date.now(),
      };
      localStorage.setItem(`rubric_metadata_${id}`, JSON.stringify(savedData));
    } catch (error) {
      // Silently handle localStorage errors
    }
    
    return result;
  } catch (error: any) {
    console.error('Error updating rubric score:', error);
    const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to update rubric score';
    throw new Error(errorMessage);
  }
};

export const deleteRubricScore = async (id: string): Promise<void> => {
  try {
    await api.delete(`rubric/${id}`);
  } catch (error: any) {
    console.error('Error deleting rubric score:', error);
    const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete rubric score';
    throw new Error(errorMessage);
  }
};
