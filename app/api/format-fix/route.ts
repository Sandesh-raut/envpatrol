
import { NextRequest, NextResponse } from "next/server";

const AUTO_FIX_PAID = process.env.AUTO_FIX_PAID === 'true';

function isLicenseValid(key?: string) {
  return !!key && key.startsWith('envp_');
}

function fixDotEnv(text: string) {
  const trimmed = text.trim();

  // --- 1️⃣ Handle JSON-like { ... } ---
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1).trim();
    const normalized = inner
      .replace(/=/g, ':')
      .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":');
    const quotedValues = normalized.replace(
      /:\s*([^"{}\[\]\s][^,\]}]*)/g,
      ':"$1"'
    );
    return `{\n${quotedValues}\n}`;
  }

  // --- 2️⃣ Normal dotenv-like content ---
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    // Trim trailing whitespace
    let line = raw.replace(/\s+$/, '');
    let t = line.trim();

    // Skip comments and blanks (but preserve spacing)
    if (!t) { out.push(''); continue; }
    if (t.startsWith('#') || t.startsWith('//')) { out.push(line); continue; }

    // --- 3️⃣ Ignore separators / notes / garbage lines ---
    if (/^[-_= ]{3,}$/.test(t)) { out.push(''); continue; }           // visual separators
    if (/^(FIXME|TODO|NOTE)\b/i.test(t)) { out.push(''); continue; }   // annotations

    // Remove leading spaces before parsing
    line = line.replace(/^\s+/, '');

    // Support `export KEY=...`
    const exportMatch = line.match(/^\s*export\s+(.+)$/i);
    const body = exportMatch ? exportMatch[1] : line;

    if (!body.includes('=')) {
      // Skip weird non-key-value noise
      continue;
    }

    let [k, ...rest] = body.split('=');
    let key = (k || '').trim();
    let val = rest.join('=').trim();

    // Normalize key to safe characters
    if (!/^[A-Z0-9_]+$/i.test(key)) {
      key = key.replace(/[^A-Z0-9_]/gi, '_');
    }

    // Quote values that have spaces, hashes, or look risky
    if ((/\s/.test(val) || /#/.test(val)) && !/^(['"]).*\1$/.test(val)) {
      val = JSON.stringify(val);
    }

    const normKey = key.toUpperCase();
    if (seen.has(normKey)) continue;
    seen.add(normKey);

    out.push(`${key}=${val}`);
  }

  // Collapse multiple blank lines into one, clean up edges
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export async function POST(req: NextRequest) {
  const { content, licenseKey } = await req.json().catch(()=>({}));

  if (AUTO_FIX_PAID && !isLicenseValid(licenseKey)) {
    return NextResponse.json({ ok: false, pro: false, error: "Pro license required" }, { status: 402 });
  }
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ ok: false, error: "No content" }, { status: 400 });
  }

  const fixed = fixDotEnv(content);
  return NextResponse.json({ ok: true, pro: AUTO_FIX_PAID, diff: { before: content, after: fixed }, fixed });
}
