export type Severity = 'critical'|'high'|'medium'|'low'|'error_format'|'warning_format';
export type ScanIssue = { key: string; sev: Severity; msg: string; line?: number; path?: string };

type Pattern = { rx: RegExp; sev: Exclude<Severity,'error_format'|'warning_format'>; msg: string };

const patterns: Pattern[] = [
  { rx: /aws.*(key|secret)/i, sev: 'critical', msg: 'AWS credential-like key' },
  { rx: /(jwt|token|secret|private_key)/i, sev: 'high', msg: 'Token or secret in plain text' },
  { rx: /(password|pwd)/i, sev: 'high', msg: 'Password-like key' },
  { rx: /(db_|database|mongo|mysql|postgres|pg_)/i, sev: 'medium', msg: 'Database credential-like key' },
  { rx: /^(debug|log_level|trace)$/i, sev: 'low', msg: 'Debug or verbose setting' },
];

const validKey = /^[A-Z0-9_]+$/i;

export function scanEnv(text: string): { score: number; issues: ScanIssue[]; format: 'dotenv'|'json' } {
  const trimmed = text.trim();
  if (!trimmed) return { score: 100, issues: [], format: 'dotenv' };

  if (looksLikeJson(trimmed)) {
    const r = scanJsonConfig(trimmed);
    return { ...r, format: 'json' };
  }

  const r = scanDotEnv(trimmed);
  return { ...r, format: 'dotenv' };
}

function looksLikeJson(t: string): boolean {
  const s = t.replace(/^\uFEFF/, '').trimStart();
  return s.startsWith('{') || s.startsWith('[');
}

function scanJsonConfig(jsonText: string): { score: number; issues: ScanIssue[] } {
  const issues: ScanIssue[] = [];
  let score = 100;

  let obj: any;
  try {
    obj = JSON.parse(jsonText);
  } catch (e: any) {
    issues.push({ key: '(json)', sev: 'error_format', msg: `JSON parse error: ${e.message}` });
    return { score: Math.max(0, score - 20), issues };
  }

  const visit = (node: any, path: string[]) => {
    if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        const v = node[k];
        const keyPath = [...path, k].join('.');
        if (!validKey.test(k)) {
          issues.push({ key: keyPath, sev: 'warning_format', msg: 'Key contains spaces or invalid characters', path: keyPath });
          score -= 2;
        }
        applyPatterns(k, v, keyPath, issues, (delta) => score -= delta);
        visit(v, [...path, k]);
      }
    }
  };

  visit(obj, []);
  return { score: Math.max(0, score), issues };
}

function scanDotEnv(text: string): { score: number; issues: ScanIssue[] } {
  const lines = text.split(/\r?\n/);
  const issues: ScanIssue[] = [];
  const seen = new Set<string>();
  let score = 100;

  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    const raw = lines[i];

    // skip empty or commented
    if (!raw.trim() || raw.trim().startsWith('#')) continue;

    // detect leading spaces before a key
    if (/^\s+[A-Z0-9_]+=/.test(raw)) {
      issues.push({
        key: raw.trim(),
        sev: 'warning_format',
        msg: 'Leading spaces before key — remove indentation for valid dotenv format',
        line: ln,
      });
      score -= 2;
    }

    // handle `export KEY=...`
    const exportMatch = raw.match(/^\s*export\s+(.+)$/i);
    const line = exportMatch ? exportMatch[1] : raw;

    if (!line.includes('=')) {
      issues.push({ key: raw, sev: 'error_format', msg: 'Missing "=" in assignment', line: ln });
      score -= 5;
      continue;
    }

    let [rawKey, ...rest] = line.split('=');
    let key = (rawKey ?? '').trim();
    let val = rest.join('=');

    if (val !== val.trim()) {
      issues.push({ key, sev: 'warning_format', msg: 'Value has leading or trailing spaces', line: ln });
      score -= 1;
    }
    val = val.trim();

    const isQuoted = /^(['"]).*\1$/.test(val);
    if (!isQuoted && /\s/.test(val) && !val.startsWith('#')) {
      issues.push({ key, sev: 'warning_format', msg: 'Unquoted value contains spaces', line: ln });
      score -= 1;
    }

    if (!/^[A-Z0-9_]+$/i.test(key)) {
      issues.push({ key, sev: 'warning_format', msg: 'Key contains spaces or invalid characters', line: ln });
      score -= 2;
      key = key.replace(/[^A-Z0-9_]/gi, '_');
    }

    const normalizedKey = key.toUpperCase();
    if (seen.has(normalizedKey)) {
      issues.push({ key, sev: 'warning_format', msg: 'Duplicate variable', line: ln });
      score -= 2;
      continue;
    }
    seen.add(normalizedKey);

    const unquoted = val.replace(/^['"]|['"]$/g, '');
    if (/^"(true|false)"$/i.test(val) || /^'(true|false)'$/i.test(val)) {
      issues.push({ key, sev: 'low', msg: 'Boolean stored as string', line: ln });
      score -= 2;
    }

    if (val.includes('\\n') && !isQuoted) {
      issues.push({ key, sev: 'warning_format', msg: 'Value contains literal \\n without quotes', line: ln });
      score -= 1;
    }

    applyPatterns(key, unquoted, key, issues, (delta) => (score -= delta));
  }

  return { score: Math.max(0, score), issues };
}


function applyPatterns(key: string, val: any, pathKey: string, issues: ScanIssue[], dec: (n: number)=>void) {
  const s = typeof val === 'string' ? val : JSON.stringify(val);
  for (const p of patterns) {
    if (p.rx.test(key) || p.rx.test(s)) {
      issues.push({ key: pathKey, sev: p.sev, msg: p.msg });
      if (p.sev === 'critical') dec(20);
      else if (p.sev === 'high') dec(10);
      else if (p.sev === 'medium') dec(5);
      else dec(2);
      break;
    }
  }
}

export function recommendation(issue: ScanIssue): string {
  switch (issue.sev) {
    case 'critical':
    case 'high':
      if (/private_key/i.test(issue.key)) {
        return 'Move private keys to a secrets manager and rotate. Remove from .env. Ensure .gitignore excludes .env.';
      }
      if (/password|token|secret/i.test(issue.key)) {
        return 'Store secrets in a vault such as 1Password Secrets, Doppler, Infisical, HashiCorp Vault, or a cloud key vault. Inject at runtime.';
      }
      return 'Do not store secrets in .env. Use a secrets manager and rotate immediately if exposed.';
    case 'medium':
      return 'Prefer secret references and separate credentials per environment. Never commit .env.';
    case 'low':
      if (issue.msg.toLowerCase().includes('boolean')) {
        return 'Store booleans without quotes like DEBUG=true. Ensure your config loader parses booleans correctly.';
      }
      return 'Clean minor config to reduce drift between environments.';
    case 'error_format':
      return 'Fix formatting first. Add missing =, quote needed values, or correct JSON. Pro can auto-fix this.';
    case 'warning_format':
      return 'Normalize keys and values. Quote values with spaces. Pro can auto-fix these items.';
    default:
      return 'Review and fix.';
  }
}
