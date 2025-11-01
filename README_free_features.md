
# EnvPatrol Local Free Features

These files enable **Download PDF** and **Save History** to work offline (no Pro needed).

## Features
- **Download PDF** opens a printable HTML report so the user can Save as PDF from the browser.
- **Save History** stores the last 50 scans in localStorage.

## Env settings for free mode
```
NEXT_PUBLIC_AUTO_FIX_PAID=false
NEXT_PUBLIC_PDF_PAID=false
NEXT_PUBLIC_HISTORY_PAID=false

AUTO_FIX_PAID=false
PDF_PAID=false
HISTORY_PAID=false
```

Once added, restart the dev server.
