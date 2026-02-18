# Changelog

## 0.1.0

Initial release.

- `protect` — interactive wizard or one-liner to gate a domain with Cloudflare Access
- `list` — show all protected domains
- `remove` — remove Access protection from a domain
- `status` — overview dashboard (team, apps, IdPs, recent activity)
- `logs` — recent access events with optional domain filter
- `inspect` — detailed app config with policy rules in plain English
- Auth methods: email OTP, GitHub OAuth, Google OAuth
- `--allow "org:name"` — restrict access to a GitHub organization
- Credential resolution via `CLOUDFLARE_API_TOKEN` or wrangler OAuth
