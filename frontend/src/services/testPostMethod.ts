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

    console.log('Testing POST method...');
    console.log('Sending data:', testData);

    const result = await createRubricScore(testData);
    
    console.log('✅ Success! Created rubric score:');
    console.log(result);
    
    return result;
  } catch (error) {
    console.error('❌ Error testing POST method:', error);
    throw error;
  }
};
