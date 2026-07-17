import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>CRITICAL</Badge>);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('applies the destructive variant class', () => {
    render(<Badge variant="destructive">Down</Badge>);
    expect(screen.getByText('Down')).toHaveClass('bg-destructive');
  });
});
