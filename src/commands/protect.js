import pc from 'picocolors';
import { input, password, select, confirm } from '@inquirer/prompts';
import { getTeamName } from '../auth.js';
import { ensureEmailOtp } from '../idp/email-otp.js';
import { ensureGitHub } from '../idp/github.js';
import { ensureGoogle } from '../idp/google.js';
import { handleApiError, ApiError } from '../api.js';
import { spin, withSpinner } from '../ui.js';

const AUTH_CHOICES = {
  email: { label: 'Email code (easiest, no setup)', setup: ensureEmailOtp },
  github: { label: 'GitHub', setup: ensureGitHub },
  google: { label: 'Google', setup: ensureGoogle },
};

const ACCESS_CHOICES = {
  me: 'Just me (enter your email)',
  domain: 'Anyone with a specific email domain (@company.com)',
  github_org: 'Members of a GitHub organization',
  emails: 'Specific email addresses',
  everyone: 'Everyone (just require login)',
};

/**
 * Main protect command — interactive wizard or one-liner.
 */
export async function protect(api, opts = {}) {
  try {
    const domain = opts.domain || await input({
      message: 'What domain do you want to protect?',
      validate: (v) => v.trim().includes('.') || 'Enter a valid domain (e.g. app.example.com)',
    });

    // Validate domain exists in CF
    await withSpinner('Verifying domain...', () => validateDomain(api, domain.trim()));
    console.log('');

    // Check if domain is already protected
    const existing = await checkExistingApp(api, domain.trim());
    if (existing) {
      console.log(`\n  ${pc.yellow('This domain is already protected by Access.')}\n`);
      console.log(`  Run ${pc.cyan(`fastpass inspect ${domain.trim()}`)} to view its configuration.`);
      console.log(`  Run ${pc.cyan(`fastpass remove ${domain.trim()}`)} to remove it first.\n`);
      return;
    }

    // Parse auth methods: comma-separated string from CLI, or single interactive choice
    const authMethods = opts.auth
      ? opts.auth.split(',').map((m) => m.trim())
      : [await select({
          message: 'How should people log in?',
          choices: Object.entries(AUTH_CHOICES).map(([value, { label }]) => ({ value, name: label })),
        })];

    for (const method of authMethods) {
      if (!AUTH_CHOICES[method]) {
        console.error(pc.red(`Unknown auth method: ${method}. Use: email, github, or google`));
        process.exit(1);
      }
    }
    console.log('');

    // Resolve who gets access
    const { include, includeType } = await resolveAccess(opts.allow, opts.hidden);
    console.log('');

    // Get team name for OAuth callback URLs
    const teamName = await withSpinner('Fetching team info', () => getTeamName(api));
    if (!teamName && authMethods.some((m) => m !== 'email')) {
      console.error(pc.red('Could not determine your Access team name.'));
      console.error('Make sure Access is enabled in your Cloudflare dashboard.\n');
      process.exit(1);
    }

    // Set up identity providers
    console.log('');
    const idpResults = [];
    for (const method of authMethods) {
      const idp = await AUTH_CHOICES[method].setup(api, teamName);
      idpResults.push(idp);
    }

    // Build the policy include rules
    const policyInclude = buildIncludeRules(include, includeType);

    // Describe access for the summary
    const accessLabel = (opts.hidden && includeType === 'emails')
      ? pc.dim('(hidden)')
      : describeAccess(include, includeType);

    // Show confirmation summary (skip when all CLI flags provided)
    const allFlagsProvided = opts.domain && opts.auth && opts.allow;
    if (!allFlagsProvided) {
      console.log(`  ${pc.bold('Domain:')}  ${domain.trim()}`);
      console.log(`  ${pc.bold('Login:')}   ${authMethods.map((m) => AUTH_CHOICES[m].label.split(' (')[0]).join(', ')}`);
      console.log(`  ${pc.bold('Access:')}  ${accessLabel}`);
      console.log('');

      const ok = await confirm({
        message: 'Create this Access application?',
        default: true,
      });

      if (!ok) {
        console.log(pc.dim('  Cancelled.\n'));
        return;
      }
    }

    // Create the access application with an inline policy
    const s = spin(`Creating Access application for ${pc.bold(domain.trim())}...`);

    const appBody = {
      name: domain.trim(),
      domain: domain.trim(),
      type: 'self_hosted',
      session_duration: '24h',
      allowed_idps: idpResults.map((idp) => idp.id),
      auto_redirect_to_identity: idpResults.length === 1,
      policies: [
        {
          name: `Allow — ${domain.trim()}`,
          decision: 'allow',
          include: policyInclude,
          precedence: 1,
        },
      ],
    };

    let app;
    try {
      const { result } = await api.post('/access/apps', appBody);
      app = result;
    } catch (err) {
      s.fail(`Failed to create Access application for ${pc.bold(domain.trim())}`);
      if (err instanceof ApiError && err.message.includes('application_already_exists')) {
        console.log(`\n  ${pc.yellow('This domain is already protected by Access.')}\n`);
        console.log(`  Run ${pc.cyan(`fastpass inspect ${domain.trim()}`)} to view its configuration.`);
        console.log(`  Run ${pc.cyan(`fastpass remove ${domain.trim()}`)} to remove it first.\n`);
        return;
      }
      throw err;
    }

    s.succeed(`Protected ${pc.bold(domain.trim())}`);
    console.log('');
    console.log(`  ${pc.bold('Your app is protected!')} Try visiting:`);
    console.log(`  ${pc.cyan(`https://${domain.trim()}`)}\n`);
    console.log(`  Manage it: ${pc.dim('https://one.dash.cloudflare.com')}`);
    console.log(`  App ID:    ${pc.dim(app.id)}\n`);

    return app;
  } catch (err) {
    handleApiError(err);
  }
}

export async function validateDomain(api, domain) {
  // Extract the root domain for zone lookup
  const parts = domain.split('.');
  const rootDomain = parts.slice(-2).join('.');

  try {
    const { result } = await api.get(`/zones?name=${rootDomain}`);
    if (!result?.length) {
      console.error(pc.red(`\nDomain "${rootDomain}" not found in your Cloudflare account.`));
      console.error('Make sure the domain is added to your Cloudflare dashboard.\n');
      process.exit(1);
    }
  } catch (err) {
    console.error(pc.red(`\nCould not verify domain: ${err.message}\n`));
    process.exit(1);
  }
}

export async function resolveAccess(allowFlag, hidden) {
  // If --allow flag was passed, parse it
  if (allowFlag) {
    if (allowFlag.startsWith('*@')) {
      return { include: [allowFlag.slice(2)], includeType: 'domain' };
    }
    if (allowFlag.startsWith('org:')) {
      return { include: [allowFlag.slice(4)], includeType: 'github_org' };
    }
    if (allowFlag === 'everyone') {
      return { include: [], includeType: 'everyone' };
    }
    // Treat as comma-separated email list
    return { include: allowFlag.split(',').map((e) => e.trim()), includeType: 'emails' };
  }

  const emailPrompt = hidden ? password : input;

  // Interactive
  const accessType = await select({
    message: 'Who should have access?',
    choices: Object.entries(ACCESS_CHOICES).map(([value, name]) => ({ value, name })),
  });

  switch (accessType) {
    case 'me': {
      const email = await emailPrompt({
        message: 'Your email address:',
        validate: (v) => v.includes('@') || 'Enter a valid email',
      });
      return { include: [email.trim()], includeType: 'emails' };
    }
    case 'domain': {
      const domain = await input({
        message: 'Email domain (e.g. company.com):',
        validate: (v) => v.includes('.') || 'Enter a valid domain',
      });
      return { include: [domain.trim()], includeType: 'domain' };
    }
    case 'github_org': {
      const org = await input({
        message: 'GitHub organization name:',
        validate: (v) => v.trim().length > 0 || 'Enter a GitHub org name',
      });
      return { include: [org.trim()], includeType: 'github_org' };
    }
    case 'emails': {
      const emails = await emailPrompt({
        message: 'Email addresses (comma-separated):',
        validate: (v) => v.includes('@') || 'Enter at least one email',
      });
      return { include: emails.split(',').map((e) => e.trim()), includeType: 'emails' };
    }
    case 'everyone':
      return { include: [], includeType: 'everyone' };
    default:
      return { include: [], includeType: 'everyone' };
  }
}

export async function checkExistingApp(api, domain) {
  const s = spin('Checking for existing application...');
  try {
    const { result } = await api.get('/access/apps');
    const match = result?.find(
      (app) => app.type === 'self_hosted' && app.domain === domain,
    );
    s.stop();
    return match || null;
  } catch {
    s.stop();
    return null;
  }
}

function describeAccess(include, includeType) {
  switch (includeType) {
    case 'emails':
      return include.join(', ');
    case 'domain':
      return `*@${include[0]}`;
    case 'github_org':
      return `GitHub org: ${include[0]}`;
    case 'everyone':
      return 'Everyone (any logged-in user)';
    default:
      return 'Everyone';
  }
}

export function buildIncludeRules(include, includeType) {
  switch (includeType) {
    case 'emails':
      // CF API expects one rule per email: [{ email: { email: "a@b.com" } }, ...]
      return include.map((email) => ({ email: { email } }));
    case 'domain':
      return [{ email_domain: { domain: include[0] } }];
    case 'github_org':
      return [{ 'github-organization': { name: include[0] } }];
    case 'everyone':
      return [{ everyone: {} }];
    default:
      return [{ everyone: {} }];
  }
}
