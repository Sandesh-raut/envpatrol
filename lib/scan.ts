// lib/scan.ts — v1.2.1
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'warning_format' | 'error_format';
export type ScanIssue = { key: string; sev: Severity; msg: string; line?: number; path?: string; };

const RX = {
  AWS_ACCESS_KEY_ID: /^(AKIA|ASIA|ACCA)[A-Z0-9]{12,16}$/,
  AWS_SECRET_ACCESS_KEY: /^[A-Za-z0-9\/+=]{30,}$/,
  PRIVATE_KEY_START: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  JWT: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
};

function isPasswordLikeKey(k: string) {
  return /(password|pwd|passphrase|secret|token|apikey|api_key|db_password)/i.test(k);
}

function applyPatterns(k: string, v: string, ctx: string, issues: ScanIssue[], penalize: (n: number)=>void) {
  if (/aws_access_key_id/i.test(k) || RX.AWS_ACCESS_KEY_ID.test(v)) {
    issues.push({ key: ctx, sev: 'high', msg: 'Possible AWS Access Key ID' }); penalize(10);
  }
  if (/aws_secret_access_key/i.test(k) || RX.AWS_SECRET_ACCESS_KEY.test(v)) {
    issues.push({ key: ctx, sev: 'critical', msg: 'Possible AWS Secret Access Key' }); penalize(20);
  }
  if (/jwt/i.test(k) || RX.JWT.test(v)) {
    issues.push({ key: ctx, sev: 'high', msg: 'Token or secret in plain text' }); penalize(8);
  }
  if (/private_key/i.test(k) || RX.PRIVATE_KEY_START.test(v)) {
    issues.push({ key: ctx, sev: 'high', msg: 'Private key material in config' }); penalize(12);
  }
  if (isPasswordLikeKey(k)) {
    issues.push({ key: ctx, sev: 'high', msg: 'Password-like key' }); penalize(8);
  }
}

function scanDotEnv(text: string): { score: number; issues: ScanIssue[] } {
  const issues: ScanIssue[] = [];
  const seen = new Set<string>();
  let score = 100;

  const rx = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))/g;
  rx.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    const keyRaw = m[1] || '';
    const val = m[2] ?? m[3] ?? m[4] ?? '';
    const before = text.slice(0, m.index);
    const ln = before.split(/\r?\n/).length;

    const lineStart = before.lastIndexOf('\n') + 1;
    const leading = before.slice(lineStart);
    if (/^\s+$/.test(leading)) {
      issues.push({ key: keyRaw, sev: 'warning_format', msg: 'Leading spaces before key — remove indentation for dotenv', line: ln });
      score -= 2;
    }

    let key = keyRaw;
    if (!/^[A-Z0-9_]+$/i.test(key)) {
      issues.push({ key, sev: 'warning_format', msg: 'Key contains invalid characters', line: ln });
      score -= 2;
      key = key.replace(/[^A-Z0-9_]/gi, '_');
    }

    const norm = key.toUpperCase();
    if (seen.has(norm)) {
      issues.push({ key, sev: 'warning_format', msg: 'Duplicate variable', line: ln });
      score -= 2;
      continue;
    }
    seen.add(norm);

    if ((/^true$/i.test(val) || /^false$/i.test(val)) && (m[2] || m[3])) {
      issues.push({ key, sev: 'low', msg: 'Boolean stored as string', line: ln });
      score -= 2;
    }

    if (m[4] && val.includes('\\n')) {
      issues.push({ key, sev: 'warning_format', msg: 'Value contains literal \\n without quotes', line: ln });
      score -= 1;
    }

    applyPatterns(key, val, key, issues, (d)=>{ score -= d; });
  }

  // Commented-secret detection with downgraded severity
  const commentRx = /#.*?([A-Z_][A-Z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))/g;
  let cm: RegExpExecArray | null;
  while ((cm = commentRx.exec(text)) !== null) {
    const key = cm[1];
    const val = cm[2] ?? cm[3] ?? cm[4] ?? '';
    const before = text.slice(0, cm.index);
    const ln = before.split(/\r?\n/).length;

    const tmp: ScanIssue[] = [];
    applyPatterns(key, val, key, tmp, ()=>{});
    for (const t of tmp) {
      const downgraded = t.sev === 'critical' ? 'high' : t.sev === 'high' ? 'medium' : t.sev;
      issues.push({ key: t.key, sev: downgraded, msg: 'Commented secret detected — ' + t.msg, line: ln });
      score -= 3;
    }
  }

  return { score: Math.max(0, score), issues };
}

function walkJSON(obj: any, path: string[], cb: (k: string, v: any, path: string[])=>void) {
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k];
      cb(k, v, path.concat(k));
      walkJSON(v, path.concat(k), cb);
    }
  }
}

function scanJSON(text: string): { score: number; issues: ScanIssue[] } {
  const issues: ScanIssue[] = [];
  let score = 100;
  try {
    const data = JSON.parse(text);
    walkJSON(data, [], (k, v, pathArr)=>{
      const path = pathArr.join('.');
      const val = typeof v === 'string' ? v : JSON.stringify(v);
      applyPatterns(k, val, path, issues, (d)=>{ score -= d; });
    });
  } catch {
    issues.push({ key: '$', sev: 'error_format', msg: 'Invalid JSON', line: 1, path: '$' });
    score -= 10;
  }
  return { score: Math.max(0, score), issues };
}

export function scanEnv(text: string): { score: number; issues: ScanIssue[]; format: 'dotenv'|'json' } {
  const looksJSON = /^[\s\uFEFF\u200B]*[\[{]/.test(text.trim());
  return looksJSON ? { ...scanJSON(text), format: 'json' } : { ...scanDotEnv(text), format: 'dotenv' };
}

export function recommendation(i: ScanIssue): string {
  const sev = i.sev;
  if (/AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID/i.test(i.key)) {
    return 'Rotate key, move to a secret manager, and use short-lived credentials.';
  }
  if (/PRIVATE_KEY/i.test(i.key)) {
    return 'Remove private key from config. Store in a secure vault and reference a path.';
  }
  if (/PASSWORD|PWD|DB_PASSWORD|SECRET|TOKEN/i.test(i.key)) {
    return 'Do not store secrets in plaintext. Use environment injection from a vault.';
  }
  if (sev === 'warning_format' || sev === 'error_format') {
    return 'Fix formatting: no leading spaces, one KEY=VALUE per line, quote values with spaces.';
  }
  return 'Review and remediate according to your org policy.';
}
