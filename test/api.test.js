import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApi, ApiError, handleApiError } from '../src/api.js';
import { ACCOUNT_ID, TOKEN } from './helpers/fixtures.js';
import { mockProcessExit, suppressConsole } from './helpers/test-utils.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

describe('createApi', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefixes /access/apps with account path', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, result: [] }),
      status: 200,
    });

    const api = createApi({ token: TOKEN, accountId: ACCOUNT_ID });
    await api.get('/access/apps');

    expect(fetch).toHaveBeenCalledWith(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('does not prefix /zones paths', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, result: [] }),
      status: 200,
    });

    const api = createApi({ token: TOKEN, accountId: ACCOUNT_ID });
    await api.get('/zones?name=example.com');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/zones?name=example.com',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('does not prefix /accounts paths', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, result: [] }),
      status: 200,
    });

    const api = createApi({ token: TOKEN, accountId: ACCOUNT_ID });
    await api.get('/accounts?per_page=5');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts?per_page=5',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws ApiError on success: false', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        errors: [{ message: 'Not found' }],
      }),
      status: 404,
    });

    const api = createApi({ token: TOKEN, accountId: ACCOUNT_ID });
    await expect(api.get('/access/apps')).rejects.toThrow(ApiError);
  });

  it('ApiError includes message, errors, and status', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        errors: [{ message: 'Forbidden' }],
      }),
      status: 403,
    });

    const api = createApi({ token: TOKEN, accountId: ACCOUNT_ID });

    try {
      await api.get('/access/apps');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.message).toBe('Forbidden');
      expect(err.errors).toEqual([{ message: 'Forbidden' }]);
      expect(err.status).toBe(403);
    }
  });

  it('sends JSON body on POST', async () => {
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ success: true, result: { id: 'new' } }),
      status: 200,
    });

    const api = createApi({ token: TOKEN, accountId: ACCOUNT_ID });
    await api.post('/access/apps', { name: 'test' });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      }),
    );
  });
});

describe('handleApiError', () => {
  let exitSpy;
  let consoleSpy;

  beforeEach(() => {
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls process.exit(1)', () => {
    const err = new ApiError('bad', [], 400);
    expect(() => handleApiError(err)).toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('shows permission hint on 403', () => {
    const err = new ApiError('Forbidden', [], 403);
    expect(() => handleApiError(err)).toThrow('process.exit(1)');
    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('required permissions'),
    );
  });

  it('handles non-ApiError errors', () => {
    const err = new Error('network failure');
    expect(() => handleApiError(err)).toThrow('process.exit(1)');
    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('network failure'),
    );
  });
});
