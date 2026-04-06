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

    files.forEach((file, index) => {
    });

    const response = await api.post('portfolio/import', formData);

    const data = response.data;
    
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
    const response = await api.post<PortfolioEvaluateResponse>('ai_evaluation/run', requestBody);
    return response.data;
  } catch (error) {
    console.error('Error evaluating portfolio:', error);
    const detail = getApiErrorDetail(error);

    if (isNoCriteriaWithDescriptionsError(detail)) {
      try {
        await refreshRubricSnapshot(rubric_id);
        const retryRes = await api.post<PortfolioEvaluateResponse>('ai_evaluation/run', requestBody);
        return retryRes.data;
      } catch (retryError) {
        console.error('Retry after rubric snapshot refresh failed:', retryError);
      }
    }

    throw new Error(detail);
  }
};
