import pc from 'picocolors';
import { spin } from './ui.js';

/**
 * Resolve Cloudflare credentials.
 *
 * Token:    CLOUDFLARE_API_TOKEN env var
 * Account:  CLOUDFLARE_ACCOUNT_ID env var, or fetched from /accounts API
 */
export async function getCredentials() {
  const s = spin('Checking Cloudflare credentials');

  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!token) {
    s.fail('No Cloudflare credentials found');
    console.error('');
    console.error(`  ${pc.bold('Set an API token:')}`);
    console.error('');
    console.error(`     ${pc.bold('export CLOUDFLARE_API_TOKEN=<your-token>')}`);
    console.error('');
    console.error(`     Create one at: ${pc.dim('https://dash.cloudflare.com/profile/api-tokens')}`);
    console.error('     Required permissions:');
    console.error(`       ${pc.dim('•')} Access: Organizations, Identity Providers, and Groups — Edit`);
    console.error(`       ${pc.dim('•')} Access: Apps and Policies — Edit`);
    console.error('');
    process.exit(1);
  }

  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!accountId) {
    s.text = 'Fetching account info';
    accountId = await fetchAccountId(token);
  }

  s.succeed('Credentials OK');
  return { token, accountId };
}

async function fetchAccountId(token) {
  const res = await fetch('https://api.cloudflare.com/client/v4/accounts?per_page=5', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();

  if (!json.success || !json.result?.length) {
    console.error(pc.red('Could not determine your Cloudflare account ID.'));
    console.error(`Set ${pc.bold('CLOUDFLARE_ACCOUNT_ID')} in your environment.\n`);
    process.exit(1);
  }

  if (json.result.length === 1) {
    return json.result[0].id;
  }

  // Multiple accounts — pick the first, but warn
  console.warn(pc.yellow(`Multiple Cloudflare accounts found. Using: ${json.result[0].name}`));
  console.warn(`Set ${pc.bold('CLOUDFLARE_ACCOUNT_ID')} to choose a specific account.\n`);
  return json.result[0].id;
}

/**
 * Fetch the Access organization team name (needed for IdP callback URLs).
 */
export async function getTeamName(api) {
  const { result } = await api.get('/access/organizations');

  if (result?.auth_domain) {
    // auth_domain looks like "myteam.cloudflareaccess.com"
    return result.auth_domain.replace('.cloudflareaccess.com', '');
  }

  return null;
}
