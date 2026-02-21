import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { status } from '../../src/commands/status.js';
import { createMockApi } from '../helpers/mock-api.js';
import { cfOk, apps, idps, org, accessLogs } from '../helpers/fixtures.js';
import { suppressConsole } from '../helpers/test-utils.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

describe('status', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parallel fetches org, apps, idps', async () => {
    const api = createMockApi();
    api.get.mockImplementation((path) => {
      if (path.includes('organizations')) return Promise.resolve(cfOk(org));
      if (path.includes('identity_providers')) return Promise.resolve(cfOk(idps));
      if (path.includes('logs')) return Promise.resolve(cfOk(accessLogs));
      return Promise.resolve(cfOk(apps));
    });

    await status(api);

    // All four endpoints called
    expect(api.get).toHaveBeenCalledWith('/access/organizations');
    expect(api.get).toHaveBeenCalledWith('/access/apps');
    expect(api.get).toHaveBeenCalledWith('/access/identity_providers');
  });

  it('displays team info', async () => {
    const api = createMockApi();
    api.get.mockImplementation((path) => {
      if (path.includes('organizations')) return Promise.resolve(cfOk(org));
      if (path.includes('identity_providers')) return Promise.resolve(cfOk(idps));
      if (path.includes('logs')) return Promise.resolve(cfOk(accessLogs));
      return Promise.resolve(cfOk(apps));
    });

    await status(api);

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('myteam.cloudflareaccess.com');
    expect(output).toContain('myteam');
  });

  it('graceful fallback when logs fetch throws', async () => {
    const api = createMockApi();
    api.get.mockImplementation((path) => {
      if (path.includes('organizations')) return Promise.resolve(cfOk(org));
      if (path.includes('identity_providers')) return Promise.resolve(cfOk(idps));
      if (path.includes('logs')) return Promise.reject(new Error('no permission'));
      return Promise.resolve(cfOk(apps));
    });

    // Should not throw — graceful fallback
    await status(api);

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Unable to fetch logs');
  });
});
