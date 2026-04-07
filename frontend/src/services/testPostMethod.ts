import { createRubricScore } from './rubricScoreApi';

export const testPostMethod = async () => {
  try {
    const testData = {
      title: 'Test Rubric Score',
      headers: ['Beginner', 'Intermediate', 'Advanced'],
      rows: [
        {
          skillArea: 'Test Skill',
          values: ['Basic', 'Good', 'Excellent']
        }
      ]
    };


    const result = await createRubricScore(testData);
    
    
    return result;
  } catch (error) {
    console.error('❌ Error testing POST method:', error);
    throw error;
  }
};
