# fastpass

Cloudflare Access in 60 seconds. No enterprise jargon.

## What you want → What it does

| You want...                        | Cloudflare calls it...         | fastpass handles it |
|------------------------------------|--------------------------------|----------------------|
| A login page on my app             | Self-hosted Access Application | `protect`            |
| GitHub/Google login                | Identity Provider (IdP)        | `--auth github`      |
| "Only my team can access this"     | Access Policy (Allow rule)     | `--allow`            |
| "Only my GitHub org"               | GitHub Organization rule       | `--allow "org:name"` |
| Email-based login, no passwords    | One-Time PIN (OTP)             | `--auth email`       |
| The wall that checks your identity | Cloudflare Access              | all of it            |

## Quickstart

```sh
npx fastpass
```

That's it. The interactive wizard walks you through everything.

## One-liners

```sh
# Protect with email login (zero config)
npx fastpass protect staging.myapp.com --auth email --allow "me@gmail.com"

# Protect with GitHub login, allow anyone at your company
npx fastpass protect staging.myapp.com --auth github --allow "*@company.com"

# Protect with GitHub login, restrict to a GitHub org
npx fastpass protect staging.myapp.com --auth github --allow "org:my-github-org"

# Protect with Google login, allow everyone (just require login)
npx fastpass protect admin.myapp.com --auth google --allow "everyone"

# List protected domains
npx fastpass list

# Remove protection
npx fastpass remove staging.myapp.com

# Overview dashboard — team, apps, IdPs, recent activity
npx fastpass status

# Recent access events (last 25)
npx fastpass logs

# Filter events to one domain, last 10
npx fastpass logs staging.myapp.com --limit 10

# Events since a specific date
npx fastpass logs --since 2025-01-15

# Detailed config for a specific app
npx fastpass inspect staging.myapp.com

# Interactive app picker
npx fastpass inspect
```

## Prerequisites

### 1. Enable Cloudflare Access (one-time)

Before fastpass can do anything, Access needs to be turned on for your account:

1. Go to [https://one.dash.cloudflare.com](https://one.dash.cloudflare.com) (Zero Trust dashboard)
2. You'll be prompted to select the **Free** plan ($0) — confirm it
3. Pick a **team name** (e.g. `myteam`) — this becomes `myteam.cloudflareaccess.com`, the login domain for all your protected apps

This only needs to happen once per account.

### 2. API credentials

You need a Cloudflare API token. Pick one:

### Option A: API Token (recommended)

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create a token with these permissions:
   - **Access: Organizations, Identity Providers, and Groups** — Edit
   - **Access: Apps and Policies** — Edit
   - **Zone: Zone** — Read
3. Set the env var:

```sh
export CLOUDFLARE_API_TOKEN="your-token"
```

Optionally set `CLOUDFLARE_ACCOUNT_ID` if you have multiple accounts.

### Option B: Wrangler login

If you already use wrangler:

```sh
npx wrangler login
npx fastpass
```

> **Note:** Wrangler's default OAuth token does not include Access scopes. If you use `wrangler login` for deploying Workers but get permission errors from fastpass, you'll need a dedicated API token (Option A). The wrangler OAuth scopes cover Workers, KV, D1, Pages, etc. — but not Cloudflare Access.

## Auth methods

### Email code (OTP)

The easiest option. No external setup required. Users get a one-time code sent to their email.

### GitHub

fastpass walks you through creating a GitHub OAuth app. You'll need to:
1. Create an OAuth app at https://github.com/settings/developers
2. Paste the Client ID and Secret when prompted

### Google

Same as GitHub — fastpass guides you through the Google Cloud Console OAuth setup.

## How it works

Under the hood, fastpass calls the Cloudflare API to:

1. **Validate** your domain exists in your CF account
2. **Create an Identity Provider** (email OTP, GitHub, or Google OAuth)
3. **Create an Access Application** on your domain with an allow policy
4. Your domain now shows a login page before granting access

All of this maps to Cloudflare's [Zero Trust Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) product — fastpass just removes the jargon and manual steps.

## FAQ

**Does this cost money?**
Cloudflare Access is free for up to 50 users.

**Can I use multiple auth methods?**
Run `protect` again on the same domain with a different `--auth` flag, or configure additional IdPs in the CF dashboard.

**What if I already have Access set up?**
fastpass detects existing identity providers and reuses them.

**How do I see what's going on?**
Run `npx fastpass status` for an overview, `npx fastpass logs` for recent events, or `npx fastpass inspect <domain>` for detailed app config.

**How do I manage users/policies after setup?**
Use the [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com).
