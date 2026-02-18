import pc from 'picocolors';
import { input, confirm } from '@inquirer/prompts';
import open from 'open';

/**
 * Ensure a GitHub OAuth identity provider exists.
 * Guides the user through creating a GitHub OAuth app if needed.
 */
export async function ensureGitHub(api, teamName) {
  const { result } = await api.get('/access/identity_providers');
  const existing = result?.find((idp) => idp.type === 'github');

  if (existing) {
    console.log(pc.green('  GitHub login already configured.'));
    return existing;
  }

  const callbackUrl = `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/callback`;
  const homepageUrl = `https://${teamName}.cloudflareaccess.com`;

  console.log('');
  console.log(pc.bold('  GitHub OAuth Setup'));
  console.log(pc.dim('  You need to create a GitHub OAuth app. It takes about 30 seconds.\n'));

  console.log(`  1. Go to ${pc.cyan('https://github.com/settings/developers')}`);
  console.log('  2. Click "New OAuth App"');
  console.log(`  3. Application name: ${pc.bold('Cloudflare Access')}`);
  console.log(`  4. Homepage URL:     ${pc.bold(homepageUrl)}`);
  console.log(`  5. Callback URL:     ${pc.bold(callbackUrl)}`);
  console.log('  6. Click "Register application"');
  console.log('  7. Generate a client secret\n');

  const shouldOpen = await confirm({
    message: 'Open GitHub settings in your browser?',
    default: true,
  });

  if (shouldOpen) {
    await open('https://github.com/settings/developers');
  }

  const clientId = await input({
    message: 'GitHub Client ID:',
    validate: (v) => v.trim().length > 0 || 'Required',
  });

  const clientSecret = await input({
    message: 'GitHub Client Secret:',
    validate: (v) => v.trim().length > 0 || 'Required',
  });

  console.log('  Creating GitHub identity provider...');
  const { result: created } = await api.post('/access/identity_providers', {
    type: 'github',
    name: 'GitHub',
    config: {
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
    },
  });

  console.log(pc.green('  GitHub login enabled.'));
  return created;
}
