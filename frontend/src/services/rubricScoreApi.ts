import { API_BASE_URL } from '../api/index';

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

interface BackendSkill {
  id: number;
  rubric_id: number;
  display_order: number;
}

interface BackendLevel {
  id: number;
  rubric_id: number;
  rank: number;
}

interface BackendCriteria {
  id: number;
  skill_id: number;
  level_id: number;
  description: string;
}

export const getRubricScores = async (): Promise<RubricScoreListItem[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rubric/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rubric scores: ${response.statusText}`);
    }
    
    const data: BackendRubric[] = await response.json();
    
    return data.map((item) => ({
      id: String(item.id),
      title: item.name,
    }));
  } catch (error) {
    console.error('Error fetching rubric scores:', error);
    throw error;
  }
};

const fetchRubricData = async (rubricId: number) => {
  try {
    // Get skills using the correct endpoint
    console.log(`[GET /rubric/${rubricId}/skills] Fetching skills...`);
    const skillsResponse = await fetch(`${API_BASE_URL}/rubric/${rubricId}/skills`);
    
    if (!skillsResponse.ok) {
      console.warn('Failed to fetch skills. Returning empty arrays.');
      return { skills: [], levels: [], criteria: [] };
    }

    const skills: BackendSkill[] = await skillsResponse.json();
    console.log(`Found ${skills.length} skills`);

    // Get levels using the new endpoint
    console.log(`[GET /rubric/${rubricId}/levels] Fetching levels...`);
    const levelsResponse = await fetch(`${API_BASE_URL}/rubric/${rubricId}/levels`);
    
    if (!levelsResponse.ok) {
      console.warn('Failed to fetch levels. Returning empty array.');
      return { skills, levels: [], criteria: [] };
    }

    const levels: BackendLevel[] = await levelsResponse.json();
    console.log(`Found ${levels.length} levels`);

    // Get criteria using the new endpoint
    console.log(`[GET /rubric/${rubricId}/criteria] Fetching criteria...`);
    const criteriaResponse = await fetch(`${API_BASE_URL}/rubric/${rubricId}/criteria`);
    
    if (!criteriaResponse.ok) {
      console.warn('Failed to fetch criteria. Returning empty array.');
      return { skills, levels, criteria: [] };
    }

    const criteria: BackendCriteria[] = await criteriaResponse.json();
    console.log(`Found ${criteria.length} criteria`);

    return { skills, levels, criteria };
  } catch (error) {
    console.warn('Error fetching rubric components:', error);
    return { skills: [], levels: [], criteria: [] };
  }
};

const transformBackendToFrontend = (
  rubric: BackendRubric,
  skills: BackendSkill[],
  levels: BackendLevel[],
  criteria: BackendCriteria[],
  savedHeaders?: string[],
  savedSkillAreas?: string[]
): RubricScoreDetail => {
  const sortedLevels = [...levels].sort((a, b) => a.rank - b.rank);
  const sortedSkills = [...skills].sort((a, b) => a.display_order - b.display_order);

  // Use saved headers if available, otherwise create empty ones
  const headers = savedHeaders && savedHeaders.length === sortedLevels.length
    ? [...savedHeaders]
    : sortedLevels.map(() => '');

  const rows: TableData[] = sortedSkills.map((skill, index) => {
    const skillCriteria = criteria.filter((c) => c.skill_id === skill.id);
    const values = sortedLevels.map((level) => {
      const criterion = skillCriteria.find((c) => c.level_id === level.id);
      return criterion ? criterion.description : '';
    });
    return {
      skillArea: savedSkillAreas && savedSkillAreas[index] !== undefined
        ? savedSkillAreas[index]
        : '',
      values,
    };
  });

  return {
    id: String(rubric.id),
    title: rubric.name,
    headers,
    rows,
  };
};

export const getRubricScore = async (id: string): Promise<RubricScoreDetail> => {
  try {
    // Get the rubric
    const rubricResponse = await fetch(`${API_BASE_URL}/rubric/${id}`);
    
    if (!rubricResponse.ok) {
      throw new Error(`Failed to fetch rubric: ${rubricResponse.statusText}`);
    }
    
    const rubric: BackendRubric = await rubricResponse.json();
    
    // Get skills, levels, and criteria using the new endpoints
    const { skills, levels, criteria } = await fetchRubricData(rubric.id);
    
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
    return transformBackendToFrontend(rubric, skills, levels, criteria, savedHeaders, savedSkillAreas);
  } catch (error) {
    console.error('Error fetching rubric score:', error);
    throw error;
  }
};

export const createRubricScore = async (
  rubricScore: Omit<RubricScoreDetail, 'id'>
): Promise<RubricScoreDetail> => {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('[createRubricScore] Function called');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('Rubric Score Data:', JSON.stringify(rubricScore, null, 2));
    console.log('═══════════════════════════════════════════════════════');
    
    const now = new Date().toISOString();
    
    const rubricPayload = {
      name: rubricScore.title,
      created_at: now,
      updated_at: now,
    };

    console.log('[POST /rubric/] Creating rubric...');
    console.log('Request URL:', `${API_BASE_URL}/rubric/`);
    console.log('Request Body:', JSON.stringify(rubricPayload, null, 2));
    
    const rubricResponse = await fetch(`${API_BASE_URL}/rubric/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rubricPayload),
    });

    console.log('Response Status:', rubricResponse.status, rubricResponse.statusText);
    
    if (!rubricResponse.ok) {
      const errorText = await rubricResponse.text();
      console.error('Error Response:', errorText);
      throw new Error(`Failed to create rubric: ${rubricResponse.statusText}`);
    }

    const rubric: BackendRubric = await rubricResponse.json();
    console.log('Success! Response JSON:', JSON.stringify(rubric, null, 2));
    console.log('Created Rubric ID:', rubric.id);

    const rubricId = rubric.id;
    const createdSkills: BackendSkill[] = [];
    const createdLevels: BackendLevel[] = [];
    const createdCriteria: BackendCriteria[] = [];

    for (let i = 0; i < rubricScore.headers.length; i++) {
      const levelPayload = {
        rubric_id: rubricId,
        rank: i + 1,
      };
      console.log(`[POST /level/] Creating level ${i + 1}...`);
      console.log(`Request URL:`, `${API_BASE_URL}/level/`);
      console.log(`Request Body:`, JSON.stringify(levelPayload, null, 2));
      
      const levelResponse = await fetch(`${API_BASE_URL}/level/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(levelPayload),
      });
      
      console.log(`Response Status:`, levelResponse.status, levelResponse.statusText);
      
      if (levelResponse.ok) {
        const level: BackendLevel = await levelResponse.json();
        createdLevels.push(level);
        console.log(`Success! Response JSON:`, JSON.stringify(level, null, 2));
        console.log(`Created Level ID:`, level.id);
      } else {
        const errorText = await levelResponse.text();
        console.error(`Error Response:`, errorText);
      }
    }

    for (let i = 0; i < rubricScore.rows.length; i++) {
      const skillPayload = {
        rubric_id: rubricId,
        display_order: i + 1,
      };
      console.log(`[POST /skill/] Creating skill ${i + 1}...`);
      console.log(`Request URL:`, `${API_BASE_URL}/skill/`);
      console.log(`Request Body:`, JSON.stringify(skillPayload, null, 2));
      
      const skillResponse = await fetch(`${API_BASE_URL}/skill/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillPayload),
      });
      
      console.log(`Response Status:`, skillResponse.status, skillResponse.statusText);
      
      if (skillResponse.ok) {
        const skill: BackendSkill = await skillResponse.json();
        createdSkills.push(skill);
        console.log(`Success! Response JSON:`, JSON.stringify(skill, null, 2));
        console.log(`Created Skill ID:`, skill.id);

        for (let j = 0; j < rubricScore.rows[i].values.length; j++) {
          if (rubricScore.rows[i].values[j].trim()) {
            const criteriaPayload = {
              skill_id: skill.id,
              level_id: createdLevels[j].id,
              description: rubricScore.rows[i].values[j].trim(),
            };
            console.log(`[POST /criteria/] Creating criteria for skill ${i + 1}, level ${j + 1}...`);
            console.log(`Request URL:`, `${API_BASE_URL}/criteria/`);
            console.log(`Request Body:`, JSON.stringify(criteriaPayload, null, 2));
            
            const criteriaResponse = await fetch(`${API_BASE_URL}/criteria/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(criteriaPayload),
            });
            
            console.log(`Response Status:`, criteriaResponse.status, criteriaResponse.statusText);
            
            if (criteriaResponse.ok) {
              const criteria: BackendCriteria = await criteriaResponse.json();
              createdCriteria.push(criteria);
              console.log(`Success! Response JSON:`, JSON.stringify(criteria, null, 2));
              console.log(`Created Criteria ID:`, criteria.id);
            } else {
              const errorText = await criteriaResponse.text();
              console.error(`Error Response:`, errorText);
            }
          }
        }
      }
    }

    console.log('───────────────────────────────────────────────────────');
    console.log('CREATION SUMMARY:');
    console.log('   Rubric ID:', rubric.id);
    console.log('   Rubric Name:', rubric.name);
    console.log('   Created Levels:', createdLevels.length);
    console.log('   Created Skills:', createdSkills.length);
    console.log('   Created Criteria:', createdCriteria.length);
    console.log('───────────────────────────────────────────────────────');
    console.log('All Created IDs:');
    console.log('   Rubric:', rubric.id);
    console.log('   Levels:', createdLevels.map(l => l.id).join(', ') || 'None');
    console.log('   Skills:', createdSkills.map(s => s.id).join(', ') || 'None');
    console.log('   Criteria:', createdCriteria.map(c => c.id).join(', ') || 'None');
    console.log('═══════════════════════════════════════════════════════');

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
  } catch (error) {
    console.error('Error creating rubric score:', error);
    throw error;
  }
};

export const updateRubricName = async (
  id: string,
  name: string
): Promise<BackendRubric> => {
  try {
    // Backend expects full RubricScoreBase: { name, created_at, updated_at }
    // So we first fetch the existing rubric to preserve created_at.
    console.log('[GET /rubric/{id}] Fetching existing rubric before rename...');
    console.log('Request URL:', `${API_BASE_URL}/rubric/${id}`);

    const existingRes = await fetch(`${API_BASE_URL}/rubric/${id}`);
    if (!existingRes.ok) {
      const errorText = await existingRes.text();
      console.error('Error Response:', errorText);
      throw new Error(`Failed to fetch rubric before rename: ${existingRes.statusText}`);
    }

    const existing: BackendRubric = await existingRes.json();

    const now = new Date().toISOString();
    const payload = {
      name: name,
      created_at: existing.created_at,
      updated_at: now,
    };

    console.log('[PUT /rubric/{id}] Updating rubric name...');
    console.log('Request URL:', `${API_BASE_URL}/rubric/${id}`);
    console.log('Request Body:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${API_BASE_URL}/rubric/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Response:', errorText);
      throw new Error(`Failed to update rubric name: ${response.statusText}`);
    }

    const data: BackendRubric = await response.json();
    console.log('Success! Response JSON:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error updating rubric name:', error);
    throw error;
  }
};

export const updateRubricScore = async (
  id: string,
  rubricScore: Omit<RubricScoreDetail, 'id'>
): Promise<RubricScoreDetail> => {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('[updateRubricScore] Function called');
    console.log('Rubric ID:', id);
    console.log('Rubric Score Data:', JSON.stringify(rubricScore, null, 2));
    console.log('═══════════════════════════════════════════════════════');

    const rubricId = parseInt(id);
    if (isNaN(rubricId)) {
      throw new Error(`Invalid rubric ID: ${id}`);
    }

    // First, update the rubric name if it changed
    try {
      await updateRubricName(id, rubricScore.title);
    } catch (error) {
      console.warn('Failed to update rubric name, continuing with levels/skills/criteria...', error);
    }

    // Delete existing skills and levels to avoid duplicates
    // First, get existing skills for this rubric
    const deletionPromises: Promise<void>[] = [];
    
    try {
      console.log('[GET /rubric/{id}/skills] Fetching existing skills...');
      const skillsResponse = await fetch(`${API_BASE_URL}/rubric/${rubricId}/skills`);
      if (skillsResponse.ok) {
        const existingSkills: BackendSkill[] = await skillsResponse.json();
        console.log(`Found ${existingSkills.length} existing skills to delete`);
        
        // Delete each skill (this will cascade delete associated criteria)
        for (const skill of existingSkills) {
          const deletePromise = fetch(`${API_BASE_URL}/skill/${skill.id}`, {
            method: 'DELETE',
          }).then(response => {
            if (response.ok) {
              console.log(`Successfully deleted skill ID: ${skill.id}`);
            } else {
              console.warn(`Failed to delete skill ID: ${skill.id}`);
            }
          }).catch(error => {
            console.warn(`Error deleting skill ID ${skill.id}:`, error);
          });
          deletionPromises.push(deletePromise);
        }
      }
    } catch (error) {
      console.warn('Could not fetch existing skills, continuing with creation...', error);
    }

    // Get existing levels using the new endpoint
    try {
      console.log(`[GET /rubric/${rubricId}/levels] Fetching existing levels...`);
      const levelsResponse = await fetch(`${API_BASE_URL}/rubric/${rubricId}/levels`);
      if (levelsResponse.ok) {
        const existingLevels: BackendLevel[] = await levelsResponse.json();
        console.log(`Found ${existingLevels.length} existing levels to delete`);
        // Delete each level (this will cascade delete associated criteria)
        for (const level of existingLevels) {
          const deletePromise = fetch(`${API_BASE_URL}/level/${level.id}`, {
            method: 'DELETE',
          }).then(response => {
            if (response.ok) {
              console.log(`Successfully deleted level ID: ${level.id}`);
            } else {
              console.warn(`Failed to delete level ID: ${level.id}`);
            }
          }).catch(error => {
            console.warn(`Error deleting level ID ${level.id}:`, error);
          });
          deletionPromises.push(deletePromise);
        }
      }
    } catch (error) {
      console.warn('Could not fetch existing levels, continuing with creation...', error);
    }

    // Wait for all deletions to complete before creating new entries
    if (deletionPromises.length > 0) {
      console.log(`Waiting for ${deletionPromises.length} deletion(s) to complete...`);
      await Promise.all(deletionPromises);
      console.log('All deletions completed. Proceeding with creation...');
      // Small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const createdSkills: BackendSkill[] = [];
    const createdLevels: BackendLevel[] = [];
    const createdCriteria: BackendCriteria[] = [];

    // Create new levels for each header
    if (rubricScore.headers.length === 0) {
      console.warn('No headers to create levels for');
    }
    
    for (let i = 0; i < rubricScore.headers.length; i++) {
      const levelPayload = {
        rubric_id: rubricId,
        rank: i + 1,
      };
      console.log(`[POST /level/] Creating level ${i + 1}...`);
      console.log(`Request URL:`, `${API_BASE_URL}/level/`);
      console.log(`Request Body:`, JSON.stringify(levelPayload, null, 2));
      
      const levelResponse = await fetch(`${API_BASE_URL}/level/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(levelPayload),
      });
      
      console.log(`Response Status:`, levelResponse.status, levelResponse.statusText);
      
      if (levelResponse.ok) {
        const level: BackendLevel = await levelResponse.json();
        createdLevels.push(level);
        console.log(`Success! Response JSON:`, JSON.stringify(level, null, 2));
        console.log(`Created Level ID:`, level.id);
      } else {
        const errorText = await levelResponse.text();
        console.error(`Error Response:`, errorText);
        throw new Error(`Failed to create level ${i + 1}: ${errorText}`);
      }
    }

    // Create new skills for each row
    if (rubricScore.rows.length === 0) {
      console.warn('No rows to create skills for');
    }
    
    // Ensure we have levels before creating skills
    if (createdLevels.length === 0 && rubricScore.headers.length > 0) {
      throw new Error('Failed to create levels. Cannot create skills without levels.');
    }
    
    for (let i = 0; i < rubricScore.rows.length; i++) {
      const skillPayload = {
        rubric_id: rubricId,
        display_order: i + 1,
      };
      console.log(`[POST /skill/] Creating skill ${i + 1}...`);
      console.log(`Request URL:`, `${API_BASE_URL}/skill/`);
      console.log(`Request Body:`, JSON.stringify(skillPayload, null, 2));
      
      const skillResponse = await fetch(`${API_BASE_URL}/skill/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillPayload),
      });
      
      console.log(`Response Status:`, skillResponse.status, skillResponse.statusText);
      
      if (skillResponse.ok) {
        const skill: BackendSkill = await skillResponse.json();
        createdSkills.push(skill);
        console.log(`Success! Response JSON:`, JSON.stringify(skill, null, 2));
        console.log(`Created Skill ID:`, skill.id);

        // Create criteria for each cell value (save ALL cells, including empty ones)
        if (rubricScore.rows[i].values.length !== createdLevels.length) {
          console.warn(`Row ${i + 1} has ${rubricScore.rows[i].values.length} values but ${createdLevels.length} levels. Adjusting...`);
        }
        
        for (let j = 0; j < Math.max(rubricScore.rows[i].values.length, createdLevels.length); j++) {
          // Skip if we don't have a level for this column
          if (j >= createdLevels.length) {
            console.warn(`Skipping criteria creation for column ${j + 1} - no level exists`);
            continue;
          }
          
          // Save all cells, even if empty, to preserve all user edits
          const cellValue = (rubricScore.rows[i].values[j] || '').trim();
          const criteriaPayload = {
            skill_id: skill.id,
            level_id: createdLevels[j].id,
            description: cellValue,
          };
          console.log(`[POST /criteria/] Creating criteria for skill ${i + 1}, level ${j + 1}...`);
          console.log(`Request URL:`, `${API_BASE_URL}/criteria/`);
          console.log(`Request Body:`, JSON.stringify(criteriaPayload, null, 2));
          
          const criteriaResponse = await fetch(`${API_BASE_URL}/criteria/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(criteriaPayload),
          });
          
          console.log(`Response Status:`, criteriaResponse.status, criteriaResponse.statusText);
          
          if (criteriaResponse.ok) {
            const criteria: BackendCriteria = await criteriaResponse.json();
            createdCriteria.push(criteria);
            console.log(`Success! Response JSON:`, JSON.stringify(criteria, null, 2));
            console.log(`Created Criteria ID:`, criteria.id);
          } else {
            const errorText = await criteriaResponse.text();
            console.error(`Error Response:`, errorText);
            
            // Check if it's a unique constraint violation (duplicate entry)
            if (criteriaResponse.status === 400 || criteriaResponse.status === 409) {
              console.warn(`Criteria already exists for skill ${skill.id}, level ${createdLevels[j].id}. This is expected if deletion didn't complete.`);
              // Try to get the existing criteria instead
              // Note: We can't easily get it without a GET endpoint, so we'll just skip it
              // The data will still be preserved in the return value from input
            } else {
              // For other errors, log but continue
              console.warn(`Failed to create criteria for skill ${skill.id}, level ${createdLevels[j].id}, but continuing...`);
            }
            // Continue even if one criteria fails, so other cells can still be saved
          }
        }
      } else {
        const errorText = await skillResponse.text();
        console.error(`Error Response:`, errorText);
        throw new Error(`Failed to create skill ${i + 1}: ${errorText}`);
      }
    }

    console.log('───────────────────────────────────────────────────────');
    console.log('UPDATE SUMMARY:');
    console.log('   Rubric ID:', rubricId);
    console.log('   Created Levels:', createdLevels.length);
    console.log('   Created Skills:', createdSkills.length);
    console.log('   Created Criteria:', createdCriteria.length);
    console.log('═══════════════════════════════════════════════════════');

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
      const skillCriteria = createdCriteria.filter((c) => c.skill_id === skill.id);
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
      console.log('Saved rubric metadata (headers, skillAreas) to localStorage');
    } catch (error) {
      console.warn('Failed to save metadata to localStorage:', error);
    }
    
    return result;
  } catch (error) {
    console.error('Error updating rubric score:', error);
    throw error;
  }
};

export const deleteRubricScore = async (id: string): Promise<void> => {
  try {
    console.log('[DELETE /rubric/{id}] Deleting rubric...');
    console.log('Request URL:', `${API_BASE_URL}/rubric/${id}`);
    
    const response = await fetch(`${API_BASE_URL}/rubric/${id}`, {
      method: 'DELETE',
    });
    
    console.log('Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Response:', errorText);
      throw new Error(`Failed to delete rubric score: ${response.statusText}`);
    }
    
    console.log('Success! Rubric deleted:', id);
  } catch (error) {
    console.error('Error deleting rubric score:', error);
    throw error;
  }
};
