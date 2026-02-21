import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockProcessExit, suppressConsole } from './helpers/test-utils.js';
import { createMockApi } from './helpers/mock-api.js';
import { cfOk } from './helpers/fixtures.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('getCredentials', () => {
  let exitSpy;
  let consoleSpy;
  let readFile;

  beforeEach(async () => {
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();
    // Reset env
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;

    const fs = await import('node:fs/promises');
    readFile = fs.readFile;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
  });

  it('returns env var token when CLOUDFLARE_API_TOKEN is set', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'my-token';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'my-account';

    const { getCredentials } = await import('../src/auth.js');
    const creds = await getCredentials();
    expect(creds.token).toBe('my-token');
    expect(creds.accountId).toBe('my-account');
  });

  it('reads wrangler TOML when no env var', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'my-account';
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    readFile.mockResolvedValue(
      `oauth_token = "wrangler-token"\nexpiration_time = "${futureDate}"`,
    );

    const { getCredentials } = await import('../src/auth.js');
    const creds = await getCredentials();
    expect(creds.token).toBe('wrangler-token');
  });

  it('returns null for expired wrangler token (exits)', async () => {
    readFile.mockResolvedValue(
      'oauth_token = "expired-token"\nexpiration_time = "2020-01-01T00:00:00Z"',
    );

    const { getCredentials } = await import('../src/auth.js');
    await expect(getCredentials()).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits when TOML file missing and no env var', async () => {
    readFile.mockRejectedValue(new Error('ENOENT'));

    const { getCredentials } = await import('../src/auth.js');
    await expect(getCredentials()).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('getTeamName', () => {
  it('extracts team name from auth_domain', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk({ auth_domain: 'myteam.cloudflareaccess.com' }));

    const { getTeamName } = await import('../src/auth.js');
    const name = await getTeamName(api);
    expect(name).toBe('myteam');
  });

  it('returns null when no auth_domain', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk({}));

    const { getTeamName } = await import('../src/auth.js');
    const name = await getTeamName(api);
    expect(name).toBeNull();
  });
});
