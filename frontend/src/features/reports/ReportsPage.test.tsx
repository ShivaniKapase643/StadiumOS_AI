import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';

vi.mock('@/lib/exportUtils', () => ({
  exportToCsv: vi.fn(),
  exportToPdf: vi.fn(),
  exportMultiSectionPdf: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ReportsPage from './ReportsPage';
import * as reportsService from '@/services/reports.service';
import { exportToCsv, exportMultiSectionPdf } from '@/lib/exportUtils';
import { toast } from 'sonner';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportsPage />
    </QueryClientProvider>
  );
}

describe('ReportsPage', () => {
  it('shows a loading skeleton while the report query is in flight', () => {
    vi.spyOn(reportsService, 'getReport').mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows the empty state when a report has no rows', async () => {
    vi.spyOn(reportsService, 'getReport').mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No data available for this report.')).toBeInTheDocument();
  });

  it('disables the CSV/PDF export buttons when there is no data', async () => {
    vi.spyOn(reportsService, 'getReport').mockResolvedValue([]);
    renderPage();
    await screen.findByText('No data available for this report.');
    expect(screen.getByRole('button', { name: /Excel \(CSV\)/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^PDF/ })).toBeDisabled();
  });

  it('renders a data table once the report loads', async () => {
    vi.spyOn(reportsService, 'getReport').mockResolvedValue([{ fixture: 'A vs B', ticketsIssued: 100 }]);
    renderPage();
    expect(await screen.findByText('A vs B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Excel \(CSV\)/ })).toBeEnabled();
  });

  it('exports the current report to CSV when clicked', async () => {
    vi.spyOn(reportsService, 'getReport').mockResolvedValue([{ fixture: 'A vs B', ticketsIssued: 100 }]);
    renderPage();
    await screen.findByText('A vs B');
    await userEvent.click(screen.getByRole('button', { name: /Excel \(CSV\)/ }));
    expect(exportToCsv).toHaveBeenCalledWith('attendance-report', [{ fixture: 'A vs B', ticketsIssued: 100 }]);
  });

  it('generates the AI Report Generator full event report on click', async () => {
    vi.spyOn(reportsService, 'getReport').mockResolvedValue([]);
    vi.spyOn(reportsService, 'getFullEventReport').mockResolvedValue({
      generatedAt: '2026-01-01T00:00:00Z',
      health: { overall: 91, overallStatus: 'green' },
      sections: { attendance: [], revenue: [], crowd: [], security: [], vendor: [], parking: [], maintenance: [] },
      aiInsights: [{ id: '1', severity: 'warning', title: 'Crowd building at Gate A' }],
    } as never);

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Generate Full Event Report/ }));

    await waitFor(() => expect(exportMultiSectionPdf).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Full event report downloaded');
    const call = vi.mocked(exportMultiSectionPdf).mock.calls[0][0];
    expect(call.summaryLines[0]).toContain('91%');
  });

  it('shows an error toast when the full event report fails to generate', async () => {
    vi.spyOn(reportsService, 'getReport').mockResolvedValue([]);
    vi.spyOn(reportsService, 'getFullEventReport').mockRejectedValue(new Error('Network error'));

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Generate Full Event Report/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
