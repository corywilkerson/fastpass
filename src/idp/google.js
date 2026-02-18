import pc from 'picocolors';
import { input, confirm } from '@inquirer/prompts';
import open from 'open';

/**
 * Ensure a Google OAuth identity provider exists.
 * Guides the user through creating a Google OAuth client if needed.
 */
export async function ensureGoogle(api, teamName) {
  const { result } = await api.get('/access/identity_providers');
  const existing = result?.find((idp) => idp.type === 'google');

  if (existing) {
    console.log(pc.green('  Google login already configured.'));
    return existing;
  }

  const callbackUrl = `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/callback`;

  console.log('');
  console.log(pc.bold('  Google OAuth Setup'));
  console.log(pc.dim('  You need to create a Google OAuth client. It takes about a minute.\n'));

  console.log(`  1. Go to ${pc.cyan('https://console.cloud.google.com/apis/credentials')}`);
  console.log('  2. Click "Create Credentials" → "OAuth client ID"');
  console.log('  3. Application type: "Web application"');
  console.log(`  4. Name: ${pc.bold('Cloudflare Access')}`);
  console.log(`  5. Authorized redirect URI: ${pc.bold(callbackUrl)}`);
  console.log('  6. Click "Create"\n');

  const shouldOpen = await confirm({
    message: 'Open Google Cloud Console in your browser?',
    default: true,
  });

  if (shouldOpen) {
    await open('https://console.cloud.google.com/apis/credentials');
  }

  const clientId = await input({
    message: 'Google Client ID:',
    validate: (v) => v.trim().length > 0 || 'Required',
  });

  const clientSecret = await input({
    message: 'Google Client Secret:',
    validate: (v) => v.trim().length > 0 || 'Required',
  });

  console.log('  Creating Google identity provider...');
  const { result: created } = await api.post('/access/identity_providers', {
    type: 'google',
    name: 'Google',
    config: {
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
    },
  });

  console.log(pc.green('  Google login enabled.'));
  return created;
}
