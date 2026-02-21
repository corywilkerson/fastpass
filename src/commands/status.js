import pc from 'picocolors';
import { handleApiError } from '../api.js';
import { withSpinner, heading } from '../ui.js';

/**
 * Status dashboard — quick snapshot of Access configuration and recent activity.
 */
export async function status(api) {
  try {
    const [{ result: org }, { result: apps }, { result: idps }] = await withSpinner(
      'Loading Access configuration',
      () => Promise.all([
        api.get('/access/organizations'),
        api.get('/access/apps'),
        api.get('/access/identity_providers'),
      ]),
    );

    // --- Team info ---
    const teamName = org?.auth_domain?.replace('.cloudflareaccess.com', '') || 'unknown';
    heading('Team');
    console.log(`  Auth domain: ${org?.auth_domain || 'n/a'}`);
    console.log(`  Team name:   ${teamName}`);

    // --- Protected apps ---
    const selfHosted = apps?.filter((a) => a.type === 'self_hosted') || [];
    heading(`Protected Apps (${selfHosted.length})`);
    if (selfHosted.length) {
      for (const app of selfHosted) {
        console.log(`  ${app.domain || app.name}`);
      }
    } else {
      console.log(pc.dim('  None'));
    }

    // --- Identity providers ---
    heading(`Identity Providers (${idps?.length || 0})`);
    if (idps?.length) {
      const maxName = Math.max(...idps.map((p) => (p.name || '').length), 4);
      console.log(`  ${pc.dim('Name'.padEnd(maxName + 2))}${pc.dim('Type')}`);
      for (const idp of idps) {
        console.log(`  ${(idp.name || 'n/a').padEnd(maxName + 2)}${idp.type || 'n/a'}`);
      }
    } else {
      console.log(pc.dim('  None'));
    }

    // --- Recent activity (graceful fallback) ---
    heading('Recent Activity');
    try {
      const { result: logs } = await api.get('/access/logs/access_requests?limit=50&direction=desc');
      if (logs?.length) {
        let allowed = 0;
        let denied = 0;
        for (const entry of logs) {
          if (entry.allowed) allowed++;
          else denied++;
        }
        console.log(`  Allowed: ${pc.green(String(allowed))}  Denied: ${pc.red(String(denied))}  (last ${logs.length} events)`);
      } else {
        console.log(pc.dim('  No recent events'));
      }
    } catch {
      console.log(pc.dim('  Unable to fetch logs (token may lack Access: Audit Logs permission)'));
    }

    console.log('');
  } catch (err) {
    handleApiError(err);
  }
}
