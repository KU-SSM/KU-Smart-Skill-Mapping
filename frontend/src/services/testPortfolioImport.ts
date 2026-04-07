import { importPortfolio } from './portfolioApi';

export const testPortfolioImport = async () => {
  const mockFiles: File[] = [
    new File(['mock pdf content'], 'portfolio1.pdf', { type: 'application/pdf' }),
  ];

  try {
    const result = await importPortfolio('1', 'Portfolio 1', mockFiles);
    return result;
  } catch (error) {
    console.error('❌ Portfolio import failed:', error);
    throw error;
  }
};
