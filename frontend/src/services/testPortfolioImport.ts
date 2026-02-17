import { importPortfolio } from './portfolioApi';

export const testPortfolioImport = async () => {
  const mockFiles: File[] = [
    new File(['mock pdf content'], 'portfolio1.pdf', { type: 'application/pdf' }),
  ];

  try {
    console.log('Testing portfolio import...');
    console.log('Note: Backend only accepts PDF files');
    const result = await importPortfolio('1', 'Portfolio 1', mockFiles);
    console.log('✅ Portfolio import successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Portfolio import failed:', error);
    throw error;
  }
};
