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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const getRubricScores = async (): Promise<RubricScoreListItem[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rubric-scores/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch rubric scores: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.map((item: any) => ({
      id: String(item.id),
      title: item.title,
    }));
  } catch (error) {
    console.error('Error fetching rubric scores:', error);
    throw error;
  }
};

export const getRubricScore = async (id: string): Promise<RubricScoreDetail> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rubric-scores/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Rubric score not found');
      }
      throw new Error(`Failed to fetch rubric score: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      id: String(data.id),
      title: data.title,
      headers: data.headers || [],
      rows: data.rows || [],
    };
  } catch (error) {
    console.error('Error fetching rubric score:', error);
    throw error;
  }
};

export const createRubricScore = async (
  rubricScore: Omit<RubricScoreDetail, 'id'>
): Promise<RubricScoreDetail> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rubric-scores/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rubricScore),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create rubric score: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      id: String(data.id),
      title: data.title,
      headers: data.headers || [],
      rows: data.rows || [],
    };
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
