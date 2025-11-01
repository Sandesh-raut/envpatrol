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
  const issues: ScanIssue[] = [];
  const seen = new Set<string>();
  let score = 100;

  // Matches KEY=VALUE repeatedly inside one line.
  // VALUE can be "quoted", 'quoted', or a bare token until whitespace or #.
  const assignRx = /(?:^|\s|;)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^ \t#]+))/g;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const ln = i + 1;
    const trimmed = raw.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // leading-space warning (helps surface “pretrailing” cases)
    if (/^\s+[A-Za-z0-9_]+=/.test(raw)) {
      issues.push({ key: raw.trim(), sev: 'warning_format', msg: 'Leading spaces before key — remove indentation for valid dotenv format', line: ln });
      score -= 2;
    }

    // Support "export KEY=..." lines by stripping "export " before parsing
    const exportMatch = raw.match(/^\s*export\s+(.+)$/i);
    const parseTarget = exportMatch ? exportMatch[1] : raw;

    let matchedAny = false;
    assignRx.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = assignRx.exec(parseTarget)) !== null) {
      matchedAny = true;
      let key = m[1] || '';
      // pick one of the 3 value capture groups
      const valStr = m[2] ?? m[3] ?? m[4] ?? '';
      let val = valStr;

      // key validity
      if (!/^[A-Z0-9_]+$/i.test(key)) {
        issues.push({ key, sev: 'warning_format', msg: 'Key contains invalid characters', line: ln });
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

      // detect booleans-in-quotes
      if (/^"(true|false)"$/i.test(`"${val}"`) || /^'(true|false)'$/i.test(`'${val}'`)) {
        issues.push({ key, sev: 'low', msg: 'Boolean stored as string', line: ln });
        score -= 2;
      }

      // literal \n without quotes (only for bare values)
      if (m[4] && val.includes('\\n')) {
        issues.push({ key, sev: 'warning_format', msg: 'Value contains literal \\n without quotes', line: ln });
        score -= 1;
      }

      // high-risk patterns
      applyPatterns(key, val, key, issues, (delta) => (score -= delta));
    }

    // If nothing matched and it isn’t a comment, try to give a useful format error
    if (!matchedAny && !/^\s*#/.test(raw)) {
      if (parseTarget.includes('=')) {
        // had an '=', but our regex couldn’t tokenize it safely
        issues.push({ key: trimmed, sev: 'warning_format', msg: 'Unparseable assignment; check quoting and spacing', line: ln });
        score -= 2;
      } else if (!/^[-_= ]{3,}$/.test(trimmed) && !/^(FIXME|TODO|NOTE)\b/i.test(trimmed)) {
        issues.push({ key: trimmed, sev: 'error_format', msg: 'Missing "=" in assignment', line: ln });
        score -= 5;
      }
    }
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
