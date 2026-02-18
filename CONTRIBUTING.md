# Contributing to fastpass

Thanks for wanting to help! Here's how to get started.

## Dev setup

```sh
git clone https://github.com/corywilkerson/fastpass.git
cd fastpass
npm install
```

You'll need Cloudflare credentials to test against a real account — see the [README](README.md#prerequisites) for setup.

## Running locally

```sh
node bin/fastpass.js --help
node bin/fastpass.js protect example.com --auth email --allow "everyone"
```

## Project structure

```
bin/          CLI entrypoint (shebang + import)
src/
  cli.js      Commander setup, command registration
  api.js      Cloudflare API client
  auth.js     Credential resolution (env var / wrangler)
  commands/   One file per command (protect, list, remove, status, logs, inspect)
  idp/        Identity provider setup (email OTP, GitHub, Google)
demo/         Example Cloudflare Worker for testing
skill/        Claude Code skill definition
```

## Adding a command

1. Create `src/commands/your-command.js` — export an async function
2. Wrap the body in `try/catch` calling `handleApiError(err)`
3. Register it in `src/cli.js` with a `program.command(...)` block
4. Update `README.md` and `skill/fastpass-skill.md`

## Style

- No build step — plain ESM, runs directly with Node
- `picocolors` for terminal colors
- `@inquirer/prompts` for interactive input
- Keep it simple — no unnecessary abstractions

## Submitting changes

1. Fork the repo and create a branch
2. Make your changes
3. Test against a real Cloudflare account if possible
4. Open a PR with a clear description of what changed and why
