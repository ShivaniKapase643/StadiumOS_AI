import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { SeatMap } from './SeatMap';
import type { Seat } from '@/types';

const seats: Seat[] = [
  { id: 's1', stadiumId: 'st1', section: 'A', row: 'A', number: 1, tier: 'GENERAL', isBooked: false },
  { id: 's2', stadiumId: 'st1', section: 'A', row: 'A', number: 2, tier: 'GENERAL', isBooked: true },
  { id: 's3', stadiumId: 'st1', section: 'A', row: 'A', number: 3, tier: 'VIP', isBooked: false },
];

describe('SeatMap', () => {
  it('renders every seat as a labeled, clickable button', () => {
    render(<SeatMap seats={seats} selectedSeatIds={new Set()} onToggleSeat={vi.fn()} maxSelectable={8} />);
    expect(screen.getByRole('button', { name: /Seat A-A1, GENERAL/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seat A-A3, VIP/ })).toBeInTheDocument();
  });

  it('disables an already-booked seat and announces it via aria-label', () => {
    render(<SeatMap seats={seats} selectedSeatIds={new Set()} onToggleSeat={vi.fn()} maxSelectable={8} />);
    const booked = screen.getByRole('button', { name: /Seat A-A2, GENERAL, already booked/ });
    expect(booked).toBeDisabled();
  });

  it('calls onToggleSeat with the seat when an available seat is clicked', async () => {
    const onToggleSeat = vi.fn();
    render(<SeatMap seats={seats} selectedSeatIds={new Set()} onToggleSeat={onToggleSeat} maxSelectable={8} />);

    await userEvent.click(screen.getByRole('button', { name: /Seat A-A1, GENERAL/ }));
    expect(onToggleSeat).toHaveBeenCalledWith(seats[0]);
  });

  it('marks a selected seat as pressed for assistive tech', () => {
    render(<SeatMap seats={seats} selectedSeatIds={new Set(['s1'])} onToggleSeat={vi.fn()} maxSelectable={8} />);
    expect(screen.getByRole('button', { name: /Seat A-A1, GENERAL, selected/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables unselected seats once maxSelectable is reached, but keeps the already-selected ones enabled', () => {
    render(<SeatMap seats={seats} selectedSeatIds={new Set(['s1'])} onToggleSeat={vi.fn()} maxSelectable={1} />);

    expect(screen.getByRole('button', { name: /Seat A-A1, GENERAL, selected/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Seat A-A3, VIP/ })).toBeDisabled();
  });

  it('does not call onToggleSeat when a disabled seat is clicked', async () => {
    const onToggleSeat = vi.fn();
    render(<SeatMap seats={seats} selectedSeatIds={new Set()} onToggleSeat={onToggleSeat} maxSelectable={8} />);

    await userEvent.click(screen.getByRole('button', { name: /already booked/ }));
    expect(onToggleSeat).not.toHaveBeenCalled();
  });

  it('renders nothing but the legend for an empty seat list (empty state)', () => {
    render(<SeatMap seats={[]} selectedSeatIds={new Set()} onToggleSeat={vi.fn()} maxSelectable={8} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });
});
