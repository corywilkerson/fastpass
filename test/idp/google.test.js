import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureGoogle } from '../../src/idp/google.js';
import { createMockApi } from '../helpers/mock-api.js';
import { cfOk, idps } from '../helpers/fixtures.js';
import { suppressConsole } from '../helpers/test-utils.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('open', () => ({ default: vi.fn() }));

describe('ensureGoogle', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns existing google IdP', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(idps));

    const result = await ensureGoogle(api, 'myteam');
    expect(result).toEqual(idps[2]); // The google one
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates new one if missing with correct POST body', async () => {
    const { input, confirm } = await import('@inquirer/prompts');
    confirm.mockResolvedValue(false);
    input
      .mockResolvedValueOnce('google-client-id')
      .mockResolvedValueOnce('google-client-secret');

    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([]));

    const created = { id: 'idp-new', name: 'Google', type: 'google' };
    api.post.mockResolvedValue(cfOk(created));

    const result = await ensureGoogle(api, 'myteam');

    expect(result).toEqual(created);
    expect(api.post).toHaveBeenCalledWith('/access/identity_providers', {
      type: 'google',
      name: 'Google',
      config: {
        client_id: 'google-client-id',
        client_secret: 'google-client-secret',
      },
    });
  });

  it('shows callback URL with teamName', async () => {
    const { input, confirm } = await import('@inquirer/prompts');
    confirm.mockResolvedValue(false);
    input
      .mockResolvedValueOnce('id')
      .mockResolvedValueOnce('secret');

    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([]));
    api.post.mockResolvedValue(cfOk({ id: 'new', type: 'google' }));

    await ensureGoogle(api, 'myteam');

    const output = consoleSpy.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('myteam.cloudflareaccess.com/cdn-cgi/access/callback');
  });

  it('opens browser when user confirms', async () => {
    const { input, confirm } = await import('@inquirer/prompts');
    const openMod = await import('open');
    confirm.mockResolvedValue(true);
    input
      .mockResolvedValueOnce('id')
      .mockResolvedValueOnce('secret');

    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([]));
    api.post.mockResolvedValue(cfOk({ id: 'new', type: 'google' }));

    await ensureGoogle(api, 'myteam');

    expect(openMod.default).toHaveBeenCalledWith(
      'https://console.cloud.google.com/apis/credentials',
    );
  });
});
