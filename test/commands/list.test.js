import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { list } from '../../src/commands/list.js';
import { createMockApi } from '../helpers/mock-api.js';
import { cfOk, apps } from '../helpers/fixtures.js';
import { suppressConsole } from '../helpers/test-utils.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

describe('list', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls api.get(/access/apps)', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(apps));

    await list(api);
    expect(api.get).toHaveBeenCalledWith('/access/apps');
  });

  it('filters to self_hosted apps', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(apps));

    await list(api);

    // Should show the 2 self_hosted apps, not the bookmark
    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('app.example.com');
    expect(output).toContain('api.example.com');
    expect(output).toContain('2 application(s)');
  });

  it('handles empty result', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([]));

    await list(api);

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('No Access applications found');
  });

  it('handles no self-hosted apps', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([{ id: 'x', type: 'bookmark' }]));

    await list(api);

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('No self-hosted Access applications found');
  });
});
