import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logs } from '../../src/commands/logs.js';
import { createMockApi } from '../helpers/mock-api.js';
import { cfOk, accessLogs } from '../helpers/fixtures.js';
import { mockProcessExit, suppressConsole } from '../helpers/test-utils.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

describe('logs', () => {
  let exitSpy;
  let consoleSpy;

  beforeEach(() => {
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invalid --since date exits', async () => {
    const api = createMockApi();

    await expect(logs(api, { since: 'not-a-date' })).rejects.toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
    // Should not have made any API call
    expect(api.get).not.toHaveBeenCalled();
  });

  it('client-side domain filter works', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(accessLogs));

    await logs(api, { domain: 'api.example.com' });

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    // Should only show the one event for api.example.com
    expect(output).toContain('dev@example.com');
    expect(output).toContain('1 event(s)');
  });

  it('handles empty results', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([]));

    await logs(api);

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('No access events found');
  });

  it('handles no events for filtered domain', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(accessLogs));

    await logs(api, { domain: 'nonexistent.com' });

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('No events found for domain');
  });

  it('passes valid since param in query', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(accessLogs));

    await logs(api, { since: '2025-06-01' });

    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('since='),
    );
  });
});
