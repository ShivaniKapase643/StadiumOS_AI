import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { PaginationControls } from './PaginationControls';

describe('PaginationControls', () => {
  it('shows the current page and total page count', () => {
    render(<PaginationControls page={2} pageSize={20} total={45} onPageChange={vi.fn()} />);
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    render(<PaginationControls page={1} pageSize={20} total={15} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('enables Next when more pages remain, and calls onPageChange with the next page', async () => {
    const onPageChange = vi.fn();
    render(<PaginationControls page={1} pageSize={20} total={45} onPageChange={onPageChange} />);

    const nextButton = screen.getByRole('button', { name: 'Next' });
    expect(nextButton).toBeEnabled();
    await userEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with the previous page when Previous is clicked', async () => {
    const onPageChange = vi.fn();
    render(<PaginationControls page={2} pageSize={20} total={45} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
