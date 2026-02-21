import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureGitHub } from '../../src/idp/github.js';
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

describe('ensureGitHub', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns existing github IdP', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(idps));

    const result = await ensureGitHub(api, 'myteam');
    expect(result).toEqual(idps[1]); // The github one
    expect(api.post).not.toHaveBeenCalled();
  });

  it('builds callback URL correctly from teamName', async () => {
    const { input, confirm } = await import('@inquirer/prompts');
    confirm.mockResolvedValue(false); // Don't open browser
    input
      .mockResolvedValueOnce('gh-client-id')
      .mockResolvedValueOnce('gh-client-secret');

    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([])); // No existing IdPs

    const created = { id: 'idp-new', name: 'GitHub', type: 'github' };
    api.post.mockResolvedValue(cfOk(created));

    await ensureGitHub(api, 'myteam');

    // Verify callback URL was displayed
    const output = consoleSpy.log.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('myteam.cloudflareaccess.com/cdn-cgi/access/callback');
    expect(output).toContain('myteam.cloudflareaccess.com');
  });

  it('POST body includes client_id and client_secret', async () => {
    const { input, confirm } = await import('@inquirer/prompts');
    confirm.mockResolvedValue(false);
    input
      .mockResolvedValueOnce('my-client-id')
      .mockResolvedValueOnce('my-client-secret');

    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([]));

    const created = { id: 'idp-new', name: 'GitHub', type: 'github' };
    api.post.mockResolvedValue(cfOk(created));

    await ensureGitHub(api, 'myteam');

    expect(api.post).toHaveBeenCalledWith('/access/identity_providers', {
      type: 'github',
      name: 'GitHub',
      config: {
        client_id: 'my-client-id',
        client_secret: 'my-client-secret',
      },
    });
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
    api.post.mockResolvedValue(cfOk({ id: 'new', type: 'github' }));

    await ensureGitHub(api, 'myteam');

    expect(openMod.default).toHaveBeenCalledWith('https://github.com/settings/developers');
  });
});
