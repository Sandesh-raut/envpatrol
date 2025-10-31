# EnvPatrol

Catch secrets and config mistakes in `.env` and JSON config files. Free scans run in the browser. Pro features add PDF export and optional history.

## Node version
Use Node 20.x

```bash
nvm install 20
nvm use 20
```

## Quick start
```bash
npm i
npm run dev
# open http://localhost:3000
```

## Deploy on Vercel
- Push this repo to GitHub
- Import in Vercel with Next.js preset
- No env vars needed for free scans

## Export as static
```bash
npm run export
# Deploy files in /out anywhere you like
```

## Security notes
- Next pinned to 14.2.33
- Free scans stay client side
- Pro API stubs live at /api/pdf and /api/save

## Roadmap
- PDF generation in API
- History with auth
- CLI and GitHub Action

## Secrets guidance
Use a secrets vault. Examples include 1Password Secrets Automation, Doppler, Infisical, HashiCorp Vault, Akeyless, or any cloud key vault. Do not keep long lived secrets in .env. Inject at runtime and rotate regularly.

## Pro features
Auto formatting fix, PDF export, history. License keys start with `envp_`. Verification at `/api/pro/verify`.

