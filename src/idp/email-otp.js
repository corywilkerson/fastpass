import { spin } from '../ui.js';

/**
 * Ensure the One-Time PIN (email code) identity provider exists.
 * Returns the IdP object.
 */
export async function ensureEmailOtp(api) {
  const s = spin('Checking for Email Login');

  const { result } = await api.get('/access/identity_providers');
  const existing = result?.find((idp) => idp.type === 'onetimepin');

  if (existing) {
    s.succeed('Email Login already configured');
    return existing;
  }

  s.text = 'Creating Email Login';
  const { result: created } = await api.post('/access/identity_providers', {
    type: 'onetimepin',
    name: 'Email Login',
    config: {},
  });

  s.succeed('Email Login enabled');
  return created;
}
