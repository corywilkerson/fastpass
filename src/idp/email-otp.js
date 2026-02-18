import pc from 'picocolors';

/**
 * Ensure the One-Time PIN (email code) identity provider exists.
 * Returns the IdP object.
 */
export async function ensureEmailOtp(api) {
  const { result } = await api.get('/access/identity_providers');
  const existing = result?.find((idp) => idp.type === 'onetimepin');

  if (existing) {
    console.log(pc.green('  Email Login already configured.'));
    return existing;
  }

  console.log('  Setting up Email Login...');
  const { result: created } = await api.post('/access/identity_providers', {
    type: 'onetimepin',
    name: 'Email Login',
    config: {},
  });

  console.log(pc.green('  Email Login enabled.'));
  return created;
}
