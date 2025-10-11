import { render, screen } from '@testing-library/react';
import App from './App';

test('renders PDF to Image Converter heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/PDF to Image Converter/i);
  expect(headingElement).toBeInTheDocument();
});
