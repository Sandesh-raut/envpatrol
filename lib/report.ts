
import type { ScanIssue } from '@/lib/scan';

export function buildReportText(params: { input: string; score: number; format: 'dotenv'|'json'; issues: ScanIssue[] }) {
  const { input, score, format, issues } = params;
  const lines: string[] = [];
  lines.push('EnvPatrol Scan Report');
  lines.push(`Format: ${format.toUpperCase()}`);
  lines.push(`Security Score: ${score}/100`);
  lines.push('');
  lines.push('Issues:');
  if (issues.length === 0) lines.push('  None');
  for (const i of issues) {
    lines.push(`  - [${i.sev.toUpperCase()}] ${i.key}${i.line ? ` (line ${i.line})` : ''} :: ${i.msg}`);
  }
  lines.push('');
  lines.push('--- Original Content ---');
  lines.push(input);
  return lines.join('\n');
}

export function buildReportHTML(params: { input: string; score: number; format: 'dotenv'|'json'; issues: ScanIssue[] }) {
  const { input, score, format, issues } = params;
  const esc = (s: string) => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!));
  const items = issues.map(i =>
    `<li><strong>[${i.sev.toUpperCase()}]</strong> <code>${esc(i.key)}</code>${i.line ? ` (line ${i.line})` : ''} — ${esc(i.msg)}</li>`
  ).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>EnvPatrol Report</title>
  <style>
    body { font: 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; color: #111; }
    h1 { margin: 0 0 8px; }
    .meta { color: #666; margin-bottom: 16px; }
    code, pre { background: #f7f7f9; padding: 2px 6px; border-radius: 4px; }
    pre { padding: 12px; overflow: auto; }
    ul { padding-left: 20px; }
    .btn { display: inline-block; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; margin: 12px 0; cursor: pointer; }
    @media print { .btn { display: none; } }
  </style>
</head>
<body>
  <h1>EnvPatrol Scan Report</h1>
  <div class="meta">Format: ${format.toUpperCase()} · Security Score: <strong>${score}/100</strong></div>
  <h3>Issues</h3>
  ${issues.length ? `<ul>${items}</ul>` : `<p>No issues</p>`}
  <button class="btn" onclick="window.print()">Print or Save as PDF</button>
  <h3>Original Content</h3>
  <pre>${esc(input)}</pre>
</body>
</html>`;
}
