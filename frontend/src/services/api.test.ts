import { describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { tokenStorage, extractErrorMessage } from './api';

describe('tokenStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns null for both tokens before anything is stored', () => {
    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
  });

  it('persists both tokens together', () => {
    tokenStorage.setTokens('access-123', 'refresh-456');
    expect(tokenStorage.getAccess()).toBe('access-123');
    expect(tokenStorage.getRefresh()).toBe('refresh-456');
  });

  it('clears both tokens', () => {
    tokenStorage.setTokens('access-123', 'refresh-456');
    tokenStorage.clear();
    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
  });
});

describe('extractErrorMessage', () => {
  it("extracts the backend's message field from an Axios error response", () => {
    const error = new axios.AxiosError('Request failed', undefined, undefined, undefined, {
      status: 400,
      data: { message: 'Validation failed: email is required' },
    } as never);
    expect(extractErrorMessage(error)).toBe('Validation failed: email is required');
  });

  it("falls back to the Axios error's own message when the response has no message field", () => {
    const error = new axios.AxiosError('Network Error');
    expect(extractErrorMessage(error)).toBe('Network Error');
  });

  it('extracts the message from a plain JS Error', () => {
    expect(extractErrorMessage(new Error('Something broke'))).toBe('Something broke');
  });

  it('falls back to a generic message for a non-Error, non-Axios value', () => {
    expect(extractErrorMessage('a raw string')).toBe('An unexpected error occurred');
    expect(extractErrorMessage(null)).toBe('An unexpected error occurred');
  });
});
