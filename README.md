# EnvPatrol

Catch secrets and config mistakes in `.env` files. Free scans run in the browser. Pro features add PDF export and optional history.

## Node version

Use Node 20.x. Example with nvm:

```bash
nvm install 20
nvm use 20
```

## Quick start (Vercel)

1. Create a new GitHub repo and push this project.
2. Import the repo in Vercel. Framework preset: Next.js.
3. Deploy. No env vars required for free scans.
4. Open the site, paste or upload a `.env`, and click Scan.

Pro stubs are under `app/api`. Replace stubs with real logic when ready.

## Local dev

```bash
npm i
npm run dev
```

## Export as static (optional)

```bash
# client only mode
npm run export
# files in /out can be hosted anywhere
```

## Security updates

Next is pinned to 14.2.33 which addresses recent advisories. If `npm audit` flags anything later, update Next and the eslint preset together:

```bash
npm i next@latest eslint-config-next@latest
```

## Project structure

```
app/
  page.tsx           UI and scan trigger
  api/
    pdf/route.ts     PDF export stub for Pro
    save/route.ts    Save history stub for Pro
lib/
  scan.ts            Client-side scanner and scoring
public/
```

## AWS API later

- Keep UI on Vercel
- Build a Lambda in ap-south-1 with two routes: `/pdf` and `/save`
- Point the UI buttons to your API Gateway URL
