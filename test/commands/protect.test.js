import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  protect,
  buildIncludeRules,
  resolveAccess,
  validateDomain,
} from '../../src/commands/protect.js';
import { createMockApi } from '../helpers/mock-api.js';
import { cfOk, zones, idps, apps } from '../helpers/fixtures.js';
import { mockProcessExit, suppressConsole } from '../helpers/test-utils.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

describe('buildIncludeRules', () => {
  it('builds email rules', () => {
    const result = buildIncludeRules(['a@b.com', 'c@d.com'], 'emails');
    expect(result).toEqual([
      { email: { email: 'a@b.com' } },
      { email: { email: 'c@d.com' } },
    ]);
  });

  it('builds domain rule', () => {
    const result = buildIncludeRules(['company.com'], 'domain');
    expect(result).toEqual([{ email_domain: { domain: 'company.com' } }]);
  });

  it('builds github org rule', () => {
    const result = buildIncludeRules(['my-org'], 'github_org');
    expect(result).toEqual([{ 'github-organization': { name: 'my-org' } }]);
  });

  it('builds everyone rule', () => {
    const result = buildIncludeRules([], 'everyone');
    expect(result).toEqual([{ everyone: {} }]);
  });

  it('defaults to everyone for unknown type', () => {
    const result = buildIncludeRules([], 'unknown');
    expect(result).toEqual([{ everyone: {} }]);
  });
});

describe('resolveAccess', () => {
  it('parses *@domain as domain type', async () => {
    const result = await resolveAccess('*@company.com');
    expect(result).toEqual({ include: ['company.com'], includeType: 'domain' });
  });

  it('parses org:name as github_org type', async () => {
    const result = await resolveAccess('org:my-org');
    expect(result).toEqual({ include: ['my-org'], includeType: 'github_org' });
  });

  it('parses "everyone" as everyone type', async () => {
    const result = await resolveAccess('everyone');
    expect(result).toEqual({ include: [], includeType: 'everyone' });
  });

  it('parses comma-separated emails', async () => {
    const result = await resolveAccess('a@b.com,c@d.com');
    expect(result).toEqual({ include: ['a@b.com', 'c@d.com'], includeType: 'emails' });
  });

  it('trims whitespace in email list', async () => {
    const result = await resolveAccess(' a@b.com , c@d.com ');
    expect(result).toEqual({ include: ['a@b.com', 'c@d.com'], includeType: 'emails' });
  });
});

describe('validateDomain', () => {
  let exitSpy;
  let consoleSpy;

  beforeEach(() => {
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts root domain and queries zones', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(zones));

    await validateDomain(api, 'sub.example.com');
    expect(api.get).toHaveBeenCalledWith('/zones?name=example.com');
  });

  it('exits if zone not found', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([]));

    await expect(validateDomain(api, 'bad.notfound.com')).rejects.toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits on API error', async () => {
    const api = createMockApi();
    api.get.mockRejectedValue(new Error('network'));

    await expect(validateDomain(api, 'app.example.com')).rejects.toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('protect() full flow', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates app with correct body when opts are provided', async () => {
    const api = createMockApi();
    // validateDomain -> zones lookup
    api.get.mockImplementation((path) => {
      if (path.startsWith('/zones')) return Promise.resolve(cfOk(zones));
      if (path.includes('/access/organizations'))
        return Promise.resolve(cfOk({ auth_domain: 'myteam.cloudflareaccess.com' }));
      if (path.includes('/access/identity_providers'))
        return Promise.resolve(cfOk(idps));
      return Promise.resolve(cfOk([]));
    });

    const createdApp = { id: 'app-new', domain: 'app.example.com' };
    api.post.mockResolvedValue(cfOk(createdApp));

    const result = await protect(api, {
      domain: 'app.example.com',
      auth: 'email',
      allow: '*@example.com',
    });

    expect(result).toEqual(createdApp);

    // Verify the POST to /access/apps
    expect(api.post).toHaveBeenCalledWith('/access/apps', expect.objectContaining({
      name: 'app.example.com',
      domain: 'app.example.com',
      type: 'self_hosted',
      session_duration: '24h',
      policies: expect.arrayContaining([
        expect.objectContaining({
          decision: 'allow',
          include: [{ email_domain: { domain: 'example.com' } }],
        }),
      ]),
    }));
  });

  it('single --auth sets auto_redirect_to_identity to true', async () => {
    const api = createMockApi();
    api.get.mockImplementation((path) => {
      if (path.startsWith('/zones')) return Promise.resolve(cfOk(zones));
      if (path.includes('/access/organizations'))
        return Promise.resolve(cfOk({ auth_domain: 'myteam.cloudflareaccess.com' }));
      if (path.includes('/access/identity_providers'))
        return Promise.resolve(cfOk(idps));
      return Promise.resolve(cfOk([]));
    });

    api.post.mockResolvedValue(cfOk({ id: 'app-new', domain: 'app.example.com' }));

    await protect(api, {
      domain: 'app.example.com',
      auth: 'email',
      allow: '*@example.com',
    });

    expect(api.post).toHaveBeenCalledWith('/access/apps', expect.objectContaining({
      auto_redirect_to_identity: true,
      allowed_idps: ['idp-1'],
    }));
  });

  it('--auth email,github creates app with both IdP IDs', async () => {
    const api = createMockApi();
    api.get.mockImplementation((path) => {
      if (path.startsWith('/zones')) return Promise.resolve(cfOk(zones));
      if (path.includes('/access/organizations'))
        return Promise.resolve(cfOk({ auth_domain: 'myteam.cloudflareaccess.com' }));
      if (path.includes('/access/identity_providers'))
        return Promise.resolve(cfOk(idps));
      return Promise.resolve(cfOk([]));
    });

    api.post.mockResolvedValue(cfOk({ id: 'app-new', domain: 'app.example.com' }));

    await protect(api, {
      domain: 'app.example.com',
      auth: 'email,github',
      allow: '*@example.com',
    });

    expect(api.post).toHaveBeenCalledWith('/access/apps', expect.objectContaining({
      allowed_idps: ['idp-1', 'idp-2'],
    }));
  });

  it('multi-auth sets auto_redirect_to_identity to false', async () => {
    const api = createMockApi();
    api.get.mockImplementation((path) => {
      if (path.startsWith('/zones')) return Promise.resolve(cfOk(zones));
      if (path.includes('/access/organizations'))
        return Promise.resolve(cfOk({ auth_domain: 'myteam.cloudflareaccess.com' }));
      if (path.includes('/access/identity_providers'))
        return Promise.resolve(cfOk(idps));
      return Promise.resolve(cfOk([]));
    });

    api.post.mockResolvedValue(cfOk({ id: 'app-new', domain: 'app.example.com' }));

    await protect(api, {
      domain: 'app.example.com',
      auth: 'email,github',
      allow: '*@example.com',
    });

    expect(api.post).toHaveBeenCalledWith('/access/apps', expect.objectContaining({
      auto_redirect_to_identity: false,
    }));
  });
});
