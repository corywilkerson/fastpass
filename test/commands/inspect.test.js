import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inspect, describeRule } from '../../src/commands/inspect.js';
import { createMockApi } from '../helpers/mock-api.js';
import { cfOk, apps, idps } from '../helpers/fixtures.js';
import { mockProcessExit, suppressConsole } from '../helpers/test-utils.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

describe('describeRule', () => {
  it('formats email rule', () => {
    expect(describeRule({ email: { email: 'user@co.com' } })).toBe('user@co.com');
  });

  it('formats email_domain rule', () => {
    expect(describeRule({ email_domain: { domain: 'co.com' } })).toBe(
      'Anyone with an @co.com email',
    );
  });

  it('formats github-organization rule', () => {
    expect(describeRule({ 'github-organization': { name: 'my-org' } })).toBe(
      'Members of GitHub org "my-org"',
    );
  });

  it('formats everyone rule', () => {
    expect(describeRule({ everyone: {} })).toBe('Everyone (any logged-in user)');
  });

  it('falls back to JSON for unknown rules', () => {
    const rule = { custom: { foo: 'bar' } };
    expect(describeRule(rule)).toBe(JSON.stringify(rule));
  });
});

describe('inspect', () => {
  let exitSpy;
  let consoleSpy;

  beforeEach(() => {
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finds app by domain', async () => {
    const api = createMockApi();
    api.get.mockImplementation((path) => {
      if (path.includes('identity_providers')) return Promise.resolve(cfOk(idps));
      return Promise.resolve(cfOk(apps));
    });

    await inspect(api, { domain: 'app.example.com' });

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('app.example.com');
    expect(output).toContain('self_hosted');
  });

  it('exits if domain not found', async () => {
    const api = createMockApi();
    api.get.mockImplementation((path) => {
      if (path.includes('identity_providers')) return Promise.resolve(cfOk(idps));
      return Promise.resolve(cfOk(apps));
    });

    await expect(inspect(api, { domain: 'nonexistent.com' })).rejects.toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('handles no apps', async () => {
    const api = createMockApi();
    api.get.mockImplementation((path) => {
      if (path.includes('identity_providers')) return Promise.resolve(cfOk([]));
      return Promise.resolve(cfOk([]));
    });

    await inspect(api);

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('No Access applications found');
  });
});
