# Format and JSON checks

EnvPatrol detects:
- Missing `=` in .env assignments
- Invalid keys with spaces or symbols
- Leading or trailing spaces around values
- Unquoted values containing spaces
- Duplicate variables (case-insensitive)
- Booleans quoted as strings
- Suspicious multiline values without quotes
- JSON configs: recursive key scan and weak key detection
- JSON parse errors are reported with `error_format`

Each issue includes a recommendation and shows line or JSON path when available.
