import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import pc from 'picocolors';
import { spin } from './ui.js';

/**
 * Resolve Cloudflare credentials.
 *
 * Priority:
 *  1. CLOUDFLARE_API_TOKEN env var
 *  2. Wrangler OAuth token from ~/.wrangler/config/default.toml
 *
 * Account ID:
 *  1. CLOUDFLARE_ACCOUNT_ID env var
 *  2. Fetched from /accounts API
 */
export async function getCredentials() {
  const s = spin('Checking Cloudflare credentials');

  let token = process.env.CLOUDFLARE_API_TOKEN;

  if (!token) {
    s.text = 'Checking Cloudflare credentials (trying wrangler)';
    token = await tryWranglerToken();
  }

  if (!token) {
    s.fail('No Cloudflare credentials found');
    console.error('');
    console.error(`  ${pc.bold('How to fix — pick one:')}`);
    console.error('');
    console.error(`  ${pc.cyan('1.')} Set an API token (recommended):`);
    console.error('');
    console.error(`     ${pc.bold('export CLOUDFLARE_API_TOKEN=<your-token>')}`);
    console.error('');
    console.error(`     Create one at: ${pc.dim('https://dash.cloudflare.com/profile/api-tokens')}`);
    console.error('     Required permissions:');
    console.error(`       ${pc.dim('•')} Access: Organizations, Identity Providers, and Groups — Edit`);
    console.error(`       ${pc.dim('•')} Access: Apps and Policies — Edit`);
    console.error('');
    console.error(`  ${pc.cyan('2.')} Log in with wrangler:`);
    console.error('');
    console.error(`     ${pc.bold('npx wrangler login')}`);
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

async function tryWranglerToken() {
  try {
    const configPath = join(homedir(), '.wrangler', 'config', 'default.toml');
    const content = await readFile(configPath, 'utf-8');
    const match = content.match(/^oauth_token\s*=\s*"(.+)"/m);
    if (match?.[1]) {
      // Check if token is expired
      const expMatch = content.match(/^expiration_time\s*=\s*"(.+)"/m);
      if (expMatch?.[1] && new Date(expMatch[1]) < new Date()) {
        return null; // expired
      }
      return match[1];
    }
  } catch {
    // config file not found — wrangler not logged in
  }
  return null;
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
