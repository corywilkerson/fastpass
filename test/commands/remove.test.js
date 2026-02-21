import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { remove } from '../../src/commands/remove.js';
import { createMockApi } from '../helpers/mock-api.js';
import { cfOk, apps } from '../helpers/fixtures.js';
import { mockProcessExit, suppressConsole } from '../helpers/test-utils.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

describe('remove', () => {
  let exitSpy;
  let consoleSpy;

  beforeEach(() => {
    exitSpy = mockProcessExit();
    consoleSpy = suppressConsole();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finds app by --domain', async () => {
    const { confirm } = await import('@inquirer/prompts');
    confirm.mockResolvedValue(true);

    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(apps));
    api.delete.mockResolvedValue(cfOk(null));

    await remove(api, { domain: 'app.example.com' });

    expect(api.delete).toHaveBeenCalledWith('/access/apps/app-1');
  });

  it('exits if domain not found', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(apps));

    await expect(remove(api, { domain: 'nonexistent.com' })).rejects.toThrow('process.exit(1)');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('calls api.delete after confirm', async () => {
    const { confirm } = await import('@inquirer/prompts');
    confirm.mockResolvedValue(true);

    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(apps));
    api.delete.mockResolvedValue(cfOk(null));

    await remove(api, { domain: 'api.example.com' });

    expect(api.delete).toHaveBeenCalledWith('/access/apps/app-2');
  });

  it('does not delete when confirm is false', async () => {
    const { confirm } = await import('@inquirer/prompts');
    confirm.mockResolvedValue(false);

    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(apps));

    await remove(api, { domain: 'app.example.com' });

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('handles no apps to remove', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([]));

    await remove(api);

    const output = consoleSpy.log.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('No Access applications to remove');
  });
});
