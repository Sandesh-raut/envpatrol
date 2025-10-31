
# Feature flags

Set these in your environment:

```env
# UI
NEXT_PUBLIC_AUTO_FIX_PAID=false
NEXT_PUBLIC_PDF_PAID=true
NEXT_PUBLIC_HISTORY_PAID=true

# API (server-only)
AUTO_FIX_PAID=false
PDF_PAID=true
HISTORY_PAID=true
```

- When NEXT_PUBLIC_AUTO_FIX_PAID=false, the Auto fix button shows without the Pro label and does not require a license.
- The button appears only when formatting issues exist (error_format or warning_format).
- Server route /api/format-fix honors AUTO_FIX_PAID to require or skip licenseKey.
