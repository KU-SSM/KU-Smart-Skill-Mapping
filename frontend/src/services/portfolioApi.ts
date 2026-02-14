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
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

    const response = await fetch(`${API_BASE_URL}/portfolio/import`, {
      method: 'POST',
      body: formData,
    });

    console.log('📥 Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.log('❌ Error Response Data:', errorData);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        const text = await response.text();
        console.log('❌ Error Response Text:', text);
        if (text) {
          errorMessage = text;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Success Response Data:', data);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    console.error('Error importing portfolio:', error);
    throw error;
  }
};
