import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app with sidebar', () => {
  render(<App />);
  const appElement = screen.getByText(/courses & skills/i);
  expect(appElement).toBeInTheDocument();
});

