# Patch: Make Download PDF and Save History work in free mode

This patch updates:
- `config/features.ts` — reads NEXT_PUBLIC_* flags for client-side gating.
- `app/page.tsx` — if PDF/HISTORY are free, performs local actions:
  - Download PDF: opens printable HTML tab (use browser Save as PDF).
  - Save History: stores last 50 scans in localStorage.

## Required env (free mode)
```
NEXT_PUBLIC_AUTO_FIX_PAID=false
NEXT_PUBLIC_PDF_PAID=false
NEXT_PUBLIC_HISTORY_PAID=false

AUTO_FIX_PAID=false
PDF_PAID=false
HISTORY_PAID=false
```

## Important
- Restart `npm run dev` after changing NEXT_PUBLIC_* flags. Client env is read at build time.
- If you still see Pro alerts, hard-reload the browser (Cmd+Shift+R).
