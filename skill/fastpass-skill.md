---
name: fastpass
description: Protect a domain with Cloudflare Access — interactive or one-liner
user_invocable: true
---

# fastpass: Cloudflare Access for Humans

You are helping the user set up Cloudflare Access on their domain using the `fastpass` CLI tool.

## What you can do

- **Protect a domain** with a login page (email code, GitHub, or Google)
- **List** currently protected domains
- **Remove** protection from a domain
- **Status** — overview dashboard of team, apps, IdPs, and recent activity
- **Logs** — view recent access events, optionally filtered by domain
- **Inspect** — deep dive into a specific app's configuration and policies

## How to use

### Interactive mode
Run the wizard and let the user answer prompts:
```bash
npx fastpass-cli
```

### One-liner mode
If the user has already told you the domain, auth method, and who should have access:
```bash
npx fastpass-cli protect <domain> --auth <email|github|google> --allow "<rule>"
```

Allow rules:
- `"me@email.com"` — specific email(s), comma-separated
- `"*@company.com"` — anyone with that email domain
- `"org:my-github-org"` — members of a GitHub organization (use with `--auth github`)
- `"everyone"` — just require login, allow all

### List protected domains
```bash
npx fastpass-cli list
```

### Remove protection
```bash
npx fastpass-cli remove <domain>
```

### Status dashboard
```bash
npx fastpass-cli status
```

### View recent access logs
```bash
npx fastpass-cli logs [domain] --limit 25 --since 2025-01-15
```

Options:
- `[domain]` — optional, filter events to a specific domain
- `--limit <n>` — number of events (default 25)
- `--since <date>` — only events after this date (ISO 8601)

### Inspect app configuration
```bash
npx fastpass-cli inspect [domain]
```

If no domain is provided, shows an interactive picker. Displays: domain, type, session duration, allowed identity providers (resolved to names), and policy rules translated to plain English.

## Prerequisites

The user needs Cloudflare credentials. Check if they have either:
1. `CLOUDFLARE_API_TOKEN` env var set, OR
2. `npx wrangler login` already done

If not, help them create an API token at https://dash.cloudflare.com/profile/api-tokens with:
- Access: Organizations, Identity Providers, and Groups — Edit
- Access: Apps and Policies — Edit
- Zone: Zone — Read

## Conversational flow

When the user asks to protect a domain, gather these three things:
1. **Domain** — what domain to protect (must be in their CF account)
2. **Auth method** — email (easiest), github, or google
3. **Access rule** — who should be allowed in

Then construct and run the appropriate `npx fastpass-cli` command.

If the user is unsure, recommend **email** auth — it requires zero external setup.
