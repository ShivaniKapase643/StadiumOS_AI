import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useAuth');
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import LoginPage from './LoginPage';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('renders email and password fields', () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn() } as never);
    renderPage();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows a validation error for a missing password instead of calling login', async () => {
    const login = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ login } as never);
    renderPage();

    // Leaving password empty is a cleaner validation trigger than a
    // malformed email here: the email field is type="email", so jsdom's own
    // (minimal) native constraint validation can intercept submission
    // before react-hook-form/zod ever run, making that path flaky to assert
    // on directly — the zod "Password is required" check isn't affected.
    await userEvent.type(screen.getByLabelText('Email'), 'fan@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials and redirects to the dashboard', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({ login } as never);
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'fan@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('fan@example.com', 'Password123!'));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true }));
    expect(toast.success).toHaveBeenCalledWith('Welcome back!');
  });

  it('shows an error toast and does not navigate when login is rejected', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid email or password'));
    vi.mocked(useAuth).mockReturnValue({ login } as never);
    renderPage();

    await userEvent.type(screen.getByLabelText('Email'), 'fan@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'WrongPassword1!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid email or password'));
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('links to the registration page for new users', () => {
    vi.mocked(useAuth).mockReturnValue({ login: vi.fn() } as never);
    renderPage();
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register');
  });
});
