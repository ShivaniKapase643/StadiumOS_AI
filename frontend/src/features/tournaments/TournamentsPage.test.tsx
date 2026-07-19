import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import TournamentsPage from './TournamentsPage';
import * as tournamentService from '@/services/tournament.service';
import type { Tournament } from '@/types';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Test Fan', role: 'FAN', email: 'fan@example.com' } }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TournamentsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const tournament: Tournament = {
  id: 't1',
  name: 'Champions Cup',
  sport: 'Football',
  status: 'UPCOMING',
  startDate: '2026-08-01T00:00:00.000Z',
  endDate: '2026-08-15T00:00:00.000Z',
  teams: [{ id: 'team1' } as never, { id: 'team2' } as never],
} as Tournament;

describe('TournamentsPage', () => {
  it('shows loading skeletons while the query is in flight', () => {
    vi.spyOn(tournamentService, 'listTournaments').mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderPage();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders tournament cards once data loads', async () => {
    vi.spyOn(tournamentService, 'listTournaments').mockResolvedValue({
      data: [tournament],
      meta: { total: 1, page: 1, pageSize: 20 },
    });

    renderPage();

    expect(await screen.findByText('Champions Cup')).toBeInTheDocument();
    expect(screen.getByText('2 teams')).toBeInTheDocument();
    expect(screen.getByText('UPCOMING')).toBeInTheDocument();
  });

  it('shows the empty state when no tournaments exist', async () => {
    vi.spyOn(tournamentService, 'listTournaments').mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 20 },
    });

    renderPage();

    expect(await screen.findByText('No tournaments yet.')).toBeInTheDocument();
  });

  it('falls back to the empty-looking state (not a distinct error UI) when the query fails', async () => {
    // Documents current behavior: TournamentsPage has no isError branch, so
    // a failed fetch renders identically to "no tournaments" rather than a
    // dedicated error message — a real UX gap, not a test assumption.
    vi.spyOn(tournamentService, 'listTournaments').mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => expect(screen.getByText('No tournaments yet.')).toBeInTheDocument());
  });

  it('hides the create-tournament action for a Fan (RBAC gate)', async () => {
    vi.spyOn(tournamentService, 'listTournaments').mockResolvedValue({
      data: [tournament],
      meta: { total: 1, page: 1, pageSize: 20 },
    });

    renderPage();

    await screen.findByText('Champions Cup');
    expect(screen.queryByRole('button', { name: /create tournament/i })).not.toBeInTheDocument();
  });
});
