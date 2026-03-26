import api from '../api/index';
import { getApiErrorDetail } from '../utils/apiErrors';

export interface PortfolioFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface PortfolioImportPayload {
  portfolio_id: string;
  portfolio_name: string;
  files: PortfolioFile[];
  uploaded_at: string;
}

export interface PortfolioImportResponse {
  success: boolean;
  message?: string;
  text?: string;
  metadata?: any;
  file_token?: string;
  original_filename?: string;
}

export interface PortfolioEvaluateItem {
  id: number;
  rubric_skill_id?: number;
  level_id?: number;
  confidence?: number;
  matched_from?: string;
  criteria_passing_description?: string;
  skill_name?: string;
  level_rank?: number;
}

export interface PortfolioEvaluateResponse {
  success: boolean;
  portfolio_id: number;
  skill_evaluation_id?: number;
  rubric_score_history_id?: number;
  classification: any;
  evaluations: PortfolioEvaluateItem[];
}

export const importPortfolio = async (
  portfolioId: string,
  portfolioName: string,
  files: File[]
): Promise<PortfolioImportResponse> => {
  try {
    if (files.length === 0) {
      throw new Error('No files provided');
    }

    const firstFile = files[0];
    
    if (!firstFile.name || !firstFile.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Invalid file type. Please upload a PDF file (.pdf)');
    }

    if (firstFile.size === 0) {
      throw new Error('File is empty');
    }

    const formData = new FormData();
    formData.append('file', firstFile, firstFile.name);

    console.log('📤 Sending portfolio data to backend:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Portfolio ID:', portfolioId);
    console.log('Portfolio Name:', portfolioName);
    console.log('Total Files:', files.length);
    console.log('File Details:');
    files.forEach((file, index) => {
      console.log(`  [${index + 1}] ${file.name}`);
      console.log(`      Size: ${file.size} bytes (${(file.size / 1024).toFixed(2)} KB)`);
      console.log(`      Type: ${file.type}`);
      console.log(`      Last Modified: ${new Date(file.lastModified).toISOString()}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FormData Contents:');
    console.log('  Field: file');
    console.log('  File Name:', firstFile.name);
    console.log('  File Size:', firstFile.size, 'bytes');
    console.log('  File Type:', firstFile.type);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const response = await api.post('portfolio/import', formData);

    console.log('Response Status:', response.status, response.statusText);
    const data = response.data;
    console.log('Success Response Data:', data);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return {
      success: true,
      message: data.message,
      text: data.text,
      metadata: data.metadata,
      file_token: data.file_token,
      original_filename: data.original_filename,
    };
  } catch (error) {
    console.error('Error importing portfolio:', error);
    throw error;
  }
};

export const evaluatePortfolio = async (
  text: string,
  rubricId: string,
  filename?: string,
  userId?: number,
  skillEvaluationId?: number,
  fileToken?: string
): Promise<PortfolioEvaluateResponse> => {
  const rubric_id = Number(rubricId);
  if (!Number.isFinite(rubric_id) || rubric_id <= 0 || !Number.isInteger(rubric_id)) {
    throw new Error(`Invalid rubric id: ${rubricId}`);
  }
  if (!Number.isFinite(userId) || (userId as number) <= 0 || !Number.isInteger(userId)) {
    throw new Error(`Invalid user id: ${String(userId)}`);
  }

  interface BackendRubric {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  }

  const refreshRubricSnapshot = async (rid: number): Promise<void> => {
    // Refresh by re-saving the rubric (backend will create a new RubricScoreHistory snapshot).
    const rubricRes = await api.get<BackendRubric>(`rubric/${rid}`);
    const rubric = rubricRes.data;
    await api.put<BackendRubric>(`rubric/${rid}`, {
      name: rubric.name,
      created_at: rubric.created_at,
      updated_at: new Date().toISOString(),
    });
  };

  const isNoCriteriaWithDescriptionsError = (detail: string): boolean => {
    const lower = detail.toLowerCase();
    return (
      lower.includes('rubric snapshot') &&
      lower.includes('no criteria') &&
      lower.includes('descriptions')
    );
  };

  const requestBody = {
    text,
    rubric_id,
    user_id: userId,
    ...(filename ? { filename } : {}),
    ...(typeof skillEvaluationId === 'number' ? { skill_evaluation_id: skillEvaluationId } : {}),
    ...(fileToken ? { file_token: fileToken } : {}),
  };

  try {
    // Use JSON body endpoint to avoid oversized query-string failures for long portfolio text.
    const response = await api.post<PortfolioEvaluateResponse>('ai_evaluation/run', requestBody);
    return response.data;
  } catch (error) {
    console.error('Error evaluating portfolio:', error);
    const detail = getApiErrorDetail(error);

    // If the backend snapshot has criteria histories but none of them include description text,
    // refresh the rubric snapshot once and retry.
    if (isNoCriteriaWithDescriptionsError(detail)) {
      try {
        await refreshRubricSnapshot(rubric_id);
        const retryRes = await api.post<PortfolioEvaluateResponse>('ai_evaluation/run', requestBody);
        return retryRes.data;
      } catch (retryError) {
        console.error('Retry after rubric snapshot refresh failed:', retryError);
        // Fall through to throw the original error detail.
      }
    }

    throw new Error(detail);
  }
};
