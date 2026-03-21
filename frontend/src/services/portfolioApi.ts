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
}

export interface PortfolioEvaluateItem {
  id: number;
  rubric_skill_id: number;
  level_id: number;
  confidence: number;
  matched_from: string;
  criteria_passing_description: string;
}

export interface PortfolioEvaluateResponse {
  success: boolean;
  portfolio_id: number;
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
    };
  } catch (error) {
    console.error('Error importing portfolio:', error);
    throw error;
  }
};

export const evaluatePortfolio = async (
  text: string,
  rubricId: string,
  filename?: string
): Promise<PortfolioEvaluateResponse> => {
  const rubric_id = Number(rubricId);
  if (!Number.isFinite(rubric_id) || rubric_id <= 0 || !Number.isInteger(rubric_id)) {
    throw new Error(`Invalid rubric id: ${rubricId}`);
  }

  try {
    // Backend expects query params (FastAPI). Do not send a JSON body (null + application/json
    // is unnecessary); use request() with no `data` so axios omits the body.
    const response = await api.request<PortfolioEvaluateResponse>({
      method: 'POST',
      url: 'portfolio/evaluate',
      params: {
        text,
        rubric_id,
        ...(filename ? { filename } : {}),
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error evaluating portfolio:', error);
    const detail = getApiErrorDetail(error);
    const hint =
      encodeURIComponent(text).length > 8000
        ? ' Long portfolio text is sent in the URL; if this persists, the server may be rejecting oversized query strings (needs a body-based API).'
        : '';
    throw new Error(detail + hint);
  }
};
