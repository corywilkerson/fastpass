import { Command } from 'commander';
import pc from 'picocolors';
import { getCredentials } from './auth.js';
import { createApi } from './api.js';
import { protect } from './commands/protect.js';
import { list } from './commands/list.js';
import { remove } from './commands/remove.js';
import { status } from './commands/status.js';
import { logs } from './commands/logs.js';
import { inspect } from './commands/inspect.js';

export function run() {
  const program = new Command();

  program
    .name('fastpass-cli')
    .description('Cloudflare Access in 60 seconds.')
    .version('0.1.0');

  // Default action (no subcommand) — run the protect wizard
  program
    .command('protect [domain]', { isDefault: true })
    .description('Protect a domain with Cloudflare Access')
    .option('--auth <method>', 'Auth method(s): email, github, google (comma-separated for multiple)')
    .option('--allow <rule>', 'Who can access: email, *@domain.com, or "everyone"')
    .action(async (domain, opts) => {
      printBanner();
      const creds = await getCredentials();
      const api = createApi(creds);
      await protect(api, { domain, ...opts });
    });

  program
    .command('list')
    .description('List protected domains')
    .action(async () => {
      const creds = await getCredentials();
      const api = createApi(creds);
      await list(api);
    });

  program
    .command('remove [domain]')
    .description('Remove protection from a domain')
    .action(async (domain) => {
      const creds = await getCredentials();
      const api = createApi(creds);
      await remove(api, { domain });
    });

  program
    .command('status')
    .description('Show Access overview: team, apps, IdPs, and recent activity')
    .action(async () => {
      const creds = await getCredentials();
      const api = createApi(creds);
      await status(api);
    });

  program
    .command('logs [domain]')
    .description('Show recent access events')
    .option('--limit <n>', 'Number of events to show', '25')
    .option('--since <date>', 'Only show events after this date (ISO 8601)')
    .action(async (domain, opts) => {
      const creds = await getCredentials();
      const api = createApi(creds);
      await logs(api, { domain, limit: parseInt(opts.limit, 10), since: opts.since });
    });

  program
    .command('inspect [domain]')
    .description('Show detailed configuration for an Access application')
    .action(async (domain) => {
      const creds = await getCredentials();
      const api = createApi(creds);
      await inspect(api, { domain });
    });

  program.parse();
}

function printBanner() {
  console.log('');
  console.log(`  ${pc.bold('fastpass')}: protect your app in 60 seconds`);
  console.log('');
}
