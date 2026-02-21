# fastpass

A CLI for rapidly configuring [Cloudflare Access](https://www.cloudflare.com/products/zero-trust/access/) — add authentication to internal apps without touching your application code. Creates Access Applications, Identity Providers, and policies via the Cloudflare API.

**Requirements:** Node 18+, Cloudflare account with the domain on your account, Cloudflare Zero Trust (Access) enabled.

## Installation

```sh
npx fastpass-cli
```

No global install. Use `npx` to run the latest version.

## Quick start

```sh
# Interactive wizard (prompts for domain, auth method, and access rules)
npx fastpass-cli

# Or one-liner
npx fastpass-cli protect staging.myapp.com --auth email --allow "me@example.com"
```

## Commands

| Command | Description |
|---------|-------------|
| `protect [domain]` | Create an Access Application. Default command when no subcommand is given. |
| `list` | List all protected domains (self-hosted Access apps). |
| `remove [domain]` | Delete Access protection from a domain. |
| `status` | Overview of team, apps, IdPs, and recent access activity. |
| `logs [domain]` | Recent access events (default: last 25). |
| `inspect [domain]` | Detailed configuration for an Access Application. |

## Protect options

```
protect [domain] [options]

Options:
  --auth <method>   email | github | google (comma-separated for multiple)
  --allow <rule>    Access rule (see below)
```

### `--allow` rule syntax

| Rule | Meaning | Example |
|------|---------|---------|
| Email address(es) | Specific users (comma-separated) | `me@example.com` or `a@b.com,b@b.com` |
| `*@domain.com` | Anyone with that email domain | `*@company.com` |
| `org:name` | Members of a GitHub organization | `org:my-org` |
| `everyone` | Any authenticated user | `everyone` |

### Auth methods

- **email** — One-time PIN (OTP) sent to email. No external setup; built into Cloudflare.
- **github** — OAuth. You create an app at [GitHub Developer Settings](https://github.com/settings/developers) and provide Client ID + Secret when prompted.
- **google** — OAuth. Same flow via Google Cloud Console.

## Credentials

fastpass needs a Cloudflare API token via the `CLOUDFLARE_API_TOKEN` environment variable.

Create an API token with:

- **Access: Organizations, Identity Providers, and Groups** — Edit
- **Access: Apps and Policies** — Edit
- **Zone: Zone** — Read (for domain validation)

Create tokens at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens).

```sh
export CLOUDFLARE_API_TOKEN="your-token"

# Optional, if you have multiple accounts:
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

**Logs:** The `logs` and `status` commands fetch access events. If they fail, your token may need **Access: Audit Logs** — Read.

## Prerequisites

1. **Cloudflare Access enabled** — In [Zero Trust](https://one.dash.cloudflare.com), select the Free plan and set a team name (e.g. `myteam` → `myteam.cloudflareaccess.com`). This is a one-time setup per account.

2. **Domain in Cloudflare** — The domain you protect must exist as a zone in your Cloudflare account. fastpass validates this before creating the Access Application.

## Example usage

```sh
# Email OTP, only you
npx fastpass-cli protect staging.myapp.com --auth email --allow "me@gmail.com"

# GitHub, anyone at your company
npx fastpass-cli protect staging.myapp.com --auth github --allow "*@company.com"

# GitHub, restrict to a specific org
npx fastpass-cli protect staging.myapp.com --auth github --allow "org:my-github-org"

# Google, any logged-in user
npx fastpass-cli protect admin.myapp.com --auth google --allow "everyone"

# Multiple login methods (email + GitHub), shows Cloudflare's provider picker
npx fastpass-cli protect staging.myapp.com --auth email,github --allow "*@company.com"

# List apps, view status, inspect config
npx fastpass-cli list
npx fastpass-cli status
npx fastpass-cli inspect staging.myapp.com

# Logs
npx fastpass-cli logs
npx fastpass-cli logs staging.myapp.com --limit 10
npx fastpass-cli logs --since 2025-01-15

# Remove protection
npx fastpass-cli remove staging.myapp.com
```

## How it works

fastpass calls the Cloudflare API to:

1. Check that the domain exists in your account (zone lookup).
2. Create or reuse an Identity Provider (email OTP, GitHub, or Google).
3. Create an Access Application (self-hosted) with an allow policy.
4. Visitors hit your domain and see Cloudflare’s login page before access.

All of this maps to Cloudflare Zero Trust Access. fastpass automates the setup; advanced configuration is done in the [Zero Trust dashboard](https://one.dash.cloudflare.com).

## FAQ

**Cost?** Cloudflare Access is free for up to 50 users.

**Existing IdPs?** fastpass reuses Identity Providers already configured in your account (e.g. Email Login, GitHub, Google).

**Existing Access setup?** If you already have Access apps and IdPs, fastpass will use them where applicable. It does not modify existing apps; `protect` creates new ones.

**Multiple auth methods per app?** Use `--auth email,github` to wire multiple IdPs in one command. When multiple methods are set, visitors see Cloudflare's provider picker instead of auto-redirecting.

**Need to change policies or users?** Use the [Zero Trust dashboard](https://one.dash.cloudflare.com).

## License

MIT
