import pc from 'picocolors';
import { handleApiError } from '../api.js';
import { withSpinner } from '../ui.js';

/**
 * Show recent access log events, optionally filtered by domain.
 */
export async function logs(api, opts = {}) {
  try {
    const limit = opts.limit || 25;

    // Validate --since if provided
    let sinceParam = '';
    if (opts.since) {
      const parsed = new Date(opts.since);
      if (isNaN(parsed.getTime())) {
        console.error(pc.red(`\n  Invalid date: ${opts.since}`));
        console.error('  Use ISO 8601 format, e.g. 2025-01-15 or 2025-01-15T00:00:00Z\n');
        process.exit(1);
      }
      sinceParam = `&since=${parsed.toISOString()}`;
    }

    const { result } = await withSpinner(
      'Fetching access events',
      () => api.get(`/access/logs/access_requests?limit=${limit}&direction=desc${sinceParam}`),
    );

    if (!result?.length) {
      console.log(pc.dim('\n  No access events found.\n'));
      return;
    }

    // Client-side domain filter
    const domain = opts.domain;
    const events = domain
      ? result.filter((e) => e.app_domain === domain)
      : result;

    if (!events.length) {
      console.log(pc.dim(`\n  No events found for domain: ${domain}\n`));
      return;
    }

    console.log(`\n  ${pc.bold('Recent Access Events')}${domain ? ` — ${domain}` : ''}\n`);

    const colTime = Math.max(...events.map((e) => formatTime(e.created_at).length), 4);
    const colEmail = Math.max(...events.map((e) => (e.user_email || '').length), 5);
    const colDomain = Math.max(...events.map((e) => (e.app_domain || '').length), 6);

    console.log(
      `  ${pc.dim('Time'.padEnd(colTime + 2))}${pc.dim('Email'.padEnd(colEmail + 2))}${pc.dim('Domain'.padEnd(colDomain + 2))}${pc.dim('OK'.padEnd(5))}${pc.dim('IP')}`,
    );
    console.log(
      pc.dim(`  ${'─'.repeat(colTime + 2)}${'─'.repeat(colEmail + 2)}${'─'.repeat(colDomain + 2)}${'─'.repeat(5)}${'─'.repeat(15)}`),
    );

    for (const e of events) {
      const time = formatTime(e.created_at).padEnd(colTime + 2);
      const email = (e.user_email || 'n/a').padEnd(colEmail + 2);
      const dom = (e.app_domain || 'n/a').padEnd(colDomain + 2);
      const ok = (e.allowed ? '✓' : '✗').padEnd(5);
      const ip = e.ip_address || 'n/a';

      const line = `  ${time}${email}${dom}${ok}${ip}`;
      console.log(e.allowed ? line : pc.red(line));
    }

    console.log(`\n  ${pc.dim(`${events.length} event(s)`)}\n`);
  } catch (err) {
    handleApiError(err);
  }
}

function formatTime(iso) {
  if (!iso) return 'n/a';
  const d = new Date(iso);
  return d.toLocaleString();
}
