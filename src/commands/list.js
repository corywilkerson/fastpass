import pc from 'picocolors';
import { handleApiError } from '../api.js';

/**
 * List all Access applications in the account.
 */
export async function list(api) {
  try {
    const { result } = await api.get('/access/apps');

    if (!result?.length) {
      console.log(pc.dim('\n  No Access applications found.\n'));
      console.log(`  Run ${pc.cyan('fastpass protect <domain>')} to get started.\n`);
      return;
    }

    // Filter to self-hosted apps (the ones fastpass creates)
    const apps = result.filter((app) => app.type === 'self_hosted');

    if (!apps.length) {
      console.log(pc.dim('\n  No self-hosted Access applications found.\n'));
      return;
    }

    console.log(`\n  ${pc.bold('Protected domains')}\n`);

    const maxDomain = Math.max(...apps.map((a) => (a.domain || '').length), 6);

    console.log(
      `  ${pc.dim('Domain'.padEnd(maxDomain + 2))}${pc.dim('Auth'.padEnd(18))}${pc.dim('Session')}`,
    );
    console.log(pc.dim(`  ${'─'.repeat(maxDomain + 2)}${'─'.repeat(18)}${'─'.repeat(10)}`));

    for (const app of apps) {
      const domain = (app.domain || 'n/a').padEnd(maxDomain + 2);
      const idpNames = app.allowed_idps?.length
        ? `${app.allowed_idps.length} provider(s)`
        : 'any';
      const session = app.session_duration || 'default';

      console.log(`  ${domain}${idpNames.padEnd(18)}${session}`);
    }

    console.log(`\n  ${pc.dim(`${apps.length} application(s)`)}\n`);
  } catch (err) {
    handleApiError(err);
  }
}
