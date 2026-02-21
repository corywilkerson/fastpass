import pc from 'picocolors';
import { select, confirm } from '@inquirer/prompts';
import { handleApiError } from '../api.js';
import { spin, withSpinner } from '../ui.js';

/**
 * Remove Access protection from a domain.
 */
export async function remove(api, opts = {}) {
  try {
    const s = spin('Fetching applications...');
    const { result } = await api.get('/access/apps');
    const apps = result?.filter((app) => app.type === 'self_hosted') || [];
    s.stop();

    if (!apps.length) {
      console.log(pc.dim('\n  No Access applications to remove.\n'));
      return;
    }

    let target;

    if (opts.domain) {
      target = apps.find((app) => app.domain === opts.domain);
      if (!target) {
        console.error(pc.red(`\n  No Access application found for domain: ${opts.domain}\n`));
        process.exit(1);
      }
    } else {
      // Interactive selection
      target = await select({
        message: 'Which application do you want to remove?',
        choices: apps.map((app) => ({
          value: app,
          name: `${app.domain || app.name} (${app.id})`,
        })),
      });
    }

    const ok = await confirm({
      message: `Remove Access protection from ${pc.bold(target.domain || target.name)}?`,
      default: false,
    });

    if (!ok) {
      console.log(pc.dim('  Cancelled.\n'));
      return;
    }

    const label = target.domain || target.name;
    await withSpinner(`Removing ${label}`, () => api.delete(`/access/apps/${target.id}`));
    console.log('');
  } catch (err) {
    handleApiError(err);
  }
}
