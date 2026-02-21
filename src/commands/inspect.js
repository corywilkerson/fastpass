import pc from 'picocolors';
import { select } from '@inquirer/prompts';
import { handleApiError } from '../api.js';
import { withSpinner, heading } from '../ui.js';

/**
 * Inspect a specific Access application's detailed configuration.
 */
export async function inspect(api, opts = {}) {
  try {
    const [{ result: apps }, { result: idps }] = await withSpinner(
      'Loading application details',
      () => Promise.all([
        api.get('/access/apps'),
        api.get('/access/identity_providers'),
      ]),
    );

    const selfHosted = apps?.filter((a) => a.type === 'self_hosted') || [];

    if (!selfHosted.length) {
      console.log(pc.dim('\n  No Access applications found.\n'));
      return;
    }

    // Build IdP lookup map
    const idpMap = new Map();
    for (const idp of idps || []) {
      idpMap.set(idp.id, idp);
    }

    let target;

    if (opts.domain) {
      target = selfHosted.find((app) => app.domain === opts.domain);
      if (!target) {
        console.error(pc.red(`\n  No Access application found for domain: ${opts.domain}\n`));
        process.exit(1);
      }
    } else {
      target = await select({
        message: 'Which application do you want to inspect?',
        choices: selfHosted.map((app) => ({
          value: app,
          name: `${app.domain || app.name} (${app.id})`,
        })),
      });
    }

    // --- App details ---
    heading('Application');
    console.log(`  Domain:           ${target.domain || 'n/a'}`);
    console.log(`  Type:             ${target.type || 'n/a'}`);
    console.log(`  Session duration: ${target.session_duration || 'default'}`);
    console.log(`  App ID:           ${pc.dim(target.id)}`);

    // --- Allowed IdPs ---
    heading('Identity Providers');
    if (target.allowed_idps?.length) {
      for (const idpId of target.allowed_idps) {
        const idp = idpMap.get(idpId);
        if (idp) {
          console.log(`  ${idp.name} (${idp.type})`);
        } else {
          console.log(`  ${pc.dim(idpId)} (unknown)`);
        }
      }
    } else {
      console.log(pc.dim('  Any provider'));
    }

    // --- Policies ---
    heading('Policies');
    if (target.policies?.length) {
      for (const policy of target.policies) {
        console.log(`  ${pc.cyan(policy.name || 'Unnamed')} — ${policy.decision || 'n/a'}`);
        if (policy.include?.length) {
          for (const rule of policy.include) {
            console.log(`    ${describeRule(rule)}`);
          }
        }
      }
    } else {
      console.log(pc.dim('  No policies configured'));
    }

    console.log('');
  } catch (err) {
    handleApiError(err);
  }
}

export function describeRule(rule) {
  if (rule.email?.email) {
    return rule.email.email;
  }
  if (rule.email_domain?.domain) {
    return `Anyone with an @${rule.email_domain.domain} email`;
  }
  if (rule['github-organization']?.name) {
    return `Members of GitHub org "${rule['github-organization'].name}"`;
  }
  if ('everyone' in rule) {
    return 'Everyone (any logged-in user)';
  }
  return JSON.stringify(rule);
}
