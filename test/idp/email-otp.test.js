import { describe, it, expect, vi, afterEach } from 'vitest';
import { ensureEmailOtp } from '../../src/idp/email-otp.js';
import { createMockApi } from '../helpers/mock-api.js';
import { cfOk, idps } from '../helpers/fixtures.js';

vi.mock('ora', () => ({
  default: () => ({ start: () => ({ text: '', succeed: vi.fn(), fail: vi.fn(), stop: vi.fn() }) }),
}));

describe('ensureEmailOtp', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns existing onetimepin IdP', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk(idps));

    const result = await ensureEmailOtp(api);
    expect(result).toEqual(idps[0]); // The onetimepin one
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates new one if missing', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([{ id: 'idp-2', name: 'GitHub', type: 'github' }]));

    const created = { id: 'idp-new', name: 'Email Login', type: 'onetimepin' };
    api.post.mockResolvedValue(cfOk(created));

    const result = await ensureEmailOtp(api);

    expect(result).toEqual(created);
    expect(api.post).toHaveBeenCalledWith('/access/identity_providers', {
      type: 'onetimepin',
      name: 'Email Login',
      config: {},
    });
  });

  it('creates new one when no IdPs exist', async () => {
    const api = createMockApi();
    api.get.mockResolvedValue(cfOk([]));

    const created = { id: 'idp-new', name: 'Email Login', type: 'onetimepin' };
    api.post.mockResolvedValue(cfOk(created));

    const result = await ensureEmailOtp(api);
    expect(result).toEqual(created);
  });
});
