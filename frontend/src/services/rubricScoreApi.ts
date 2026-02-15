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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
    const [skillsRes, levelsRes, criteriaRes] = await Promise.all([
      fetch(`${API_BASE_URL}/skill/?rubric_id=${rubricId}`).catch(() => null),
      fetch(`${API_BASE_URL}/level/?rubric_id=${rubricId}`).catch(() => null),
      fetch(`${API_BASE_URL}/criteria/?rubric_id=${rubricId}`).catch(() => null),
    ]);

    if (!skillsRes || !skillsRes.ok || !levelsRes || !levelsRes.ok || !criteriaRes || !criteriaRes.ok) {
      console.warn('GET endpoints for skill/level/criteria not available. Returning empty arrays.');
      return { skills: [], levels: [], criteria: [] };
    }

    const skills: BackendSkill[] = await skillsRes.json();
    const levels: BackendLevel[] = await levelsRes.json();
    const criteria: BackendCriteria[] = await criteriaRes.json();

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
  criteria: BackendCriteria[]
): RubricScoreDetail => {
  const sortedLevels = [...levels].sort((a, b) => a.rank - b.rank);
  const sortedSkills = [...skills].sort((a, b) => a.display_order - b.display_order);

  const headers = sortedLevels.map(() => '');

  const rows: TableData[] = sortedSkills.map((skill) => {
    const skillCriteria = criteria.filter((c) => c.skill_id === skill.id);
    const values = sortedLevels.map((level) => {
      const criterion = skillCriteria.find((c) => c.level_id === level.id);
      return criterion ? criterion.description : '';
    });
    return {
      skillArea: '',
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
    const allRubricsResponse = await fetch(`${API_BASE_URL}/rubric/`);
    
    if (!allRubricsResponse.ok) {
      throw new Error(`Failed to fetch rubrics: ${allRubricsResponse.statusText}`);
    }
    
    const allRubrics: BackendRubric[] = await allRubricsResponse.json();
    const rubric = allRubrics.find(r => String(r.id) === id);
    
    if (!rubric) {
      throw new Error('Rubric score not found');
    }
    
    const { skills, levels, criteria } = await fetchRubricData(rubric.id);
    
    return transformBackendToFrontend(rubric, skills, levels, criteria);
  } catch (error) {
    console.error('Error fetching rubric score:', error);
    throw error;
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

    console.log('📤 Creating rubric:', rubricPayload);
    const rubricResponse = await fetch(`${API_BASE_URL}/rubric/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rubricPayload),
    });

    if (!rubricResponse.ok) {
      throw new Error(`Failed to create rubric: ${rubricResponse.statusText}`);
    }

    const rubric: BackendRubric = await rubricResponse.json();
    console.log('✅ Rubric created:', rubric);

    const rubricId = rubric.id;
    const createdSkills: BackendSkill[] = [];
    const createdLevels: BackendLevel[] = [];

    for (let i = 0; i < rubricScore.headers.length; i++) {
      const levelPayload = {
        rubric_id: rubricId,
        rank: i + 1,
      };
      console.log(`📤 Creating level ${i + 1}:`, levelPayload);
      const levelResponse = await fetch(`${API_BASE_URL}/level/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(levelPayload),
      });
      if (levelResponse.ok) {
        const level: BackendLevel = await levelResponse.json();
        createdLevels.push(level);
        console.log('✅ Level created:', level);
      }
    }

    for (let i = 0; i < rubricScore.rows.length; i++) {
      const skillPayload = {
        rubric_id: rubricId,
        display_order: i + 1,
      };
      console.log(`📤 Creating skill ${i + 1}:`, skillPayload);
      const skillResponse = await fetch(`${API_BASE_URL}/skill/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillPayload),
      });
      if (skillResponse.ok) {
        const skill: BackendSkill = await skillResponse.json();
        createdSkills.push(skill);
        console.log('✅ Skill created:', skill);

        for (let j = 0; j < rubricScore.rows[i].values.length; j++) {
          if (rubricScore.rows[i].values[j].trim()) {
            const criteriaPayload = {
              skill_id: skill.id,
              level_id: createdLevels[j].id,
              description: rubricScore.rows[i].values[j].trim(),
            };
            console.log(`📤 Creating criteria for skill ${i + 1}, level ${j + 1}:`, criteriaPayload);
            const criteriaResponse = await fetch(`${API_BASE_URL}/criteria/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(criteriaPayload),
            });
            if (criteriaResponse.ok) {
              const criteria: BackendCriteria = await criteriaResponse.json();
              console.log('✅ Criteria created:', criteria);
            }
          }
        }
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
  } catch (error) {
    console.error('Error creating rubric score:', error);
    throw error;
  }
};

export const updateRubricScore = async (
  id: string,
  rubricScore: Omit<RubricScoreDetail, 'id'>
): Promise<RubricScoreDetail> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rubric-scores/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rubricScore),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update rubric score: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      id: String(data.id),
      title: data.title,
      headers: data.headers || [],
      rows: data.rows || [],
    };
  } catch (error) {
    console.error('Error updating rubric score:', error);
    throw error;
  }
};

export const deleteRubricScore = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rubric-scores/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete rubric score: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting rubric score:', error);
    throw error;
  }
};
