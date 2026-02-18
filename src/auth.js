import { execSync } from 'node:child_process';
import pc from 'picocolors';

/**
 * Resolve Cloudflare credentials.
 *
 * Priority:
 *  1. CLOUDFLARE_API_TOKEN env var
 *  2. `wrangler auth token` fallback (OAuth token)
 *
 * Account ID:
 *  1. CLOUDFLARE_ACCOUNT_ID env var
 *  2. Fetched from /accounts API
 */
export async function getCredentials() {
  let token = process.env.CLOUDFLARE_API_TOKEN;

  if (!token) {
    token = tryWranglerToken();
  }

  if (!token) {
    console.error(pc.red('\nCould not find Cloudflare credentials.\n'));
    console.error('Set one of the following:\n');
    console.error(`  ${pc.bold('CLOUDFLARE_API_TOKEN')}  — API token (recommended)`);
    console.error(`                         Create one at https://dash.cloudflare.com/profile/api-tokens`);
    console.error(`                         Needs ${pc.cyan('Access: Organizations, Identity Providers, and Groups — Edit')}`);
    console.error(`                         and   ${pc.cyan('Access: Apps and Policies — Edit')}\n`);
    console.error(`  Or install ${pc.bold('wrangler')} and run ${pc.cyan('npx wrangler login')} first.\n`);
    process.exit(1);
  }

  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!accountId) {
    accountId = await fetchAccountId(token);
  }

  return { token, accountId };
}

function tryWranglerToken() {
  try {
    const result = execSync('npx wrangler --version 2>/dev/null && npx wrangler auth token 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const trimmed = result.trim();
    if (trimmed && !trimmed.includes('Error') && !trimmed.includes('error')) {
      return trimmed;
    }
  } catch {
    // wrangler not available or not logged in
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
