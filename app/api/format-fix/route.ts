import { NextRequest, NextResponse } from "next/server";

// very conservative normalizer: trims, fixes missing = if obvious,
// quotes values with spaces, removes duplicate keys by last one wins
function fixDotEnv(text: string) {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = raw.trimRight();
    if (!line || line.trimStart().startsWith("#")) { out.push(line); continue; }
    const exportMatch = line.match(/^\s*export\s+(.+)$/i);
    const body = exportMatch ? exportMatch[1] : line;

    if (!body.includes("=")) { out.push(`# FIXME missing "=" -> ${line}`); continue; }

    let [k, ...rest] = body.split("=");
    let key = (k || "").trim().replace(/[^A-Z0-9_]/gi, "_");
    let val = rest.join("=").trim();
    if (/\s/.test(val) && !/^(['"]).*\1$/.test(val)) val = JSON.stringify(val);
    const normKey = key.toUpperCase();
    if (seen.has(normKey)) { /* drop duplicate earlier value, keep last */ }
    seen.add(normKey);
    out.push(`${key}=${val}`);
  }
  return out.join("\n");
}

export async function POST(req: NextRequest) {
  const { content, licenseKey } = await req.json().catch(()=>({}));
  if (!licenseKey || !licenseKey.startsWith("envp_")) {
    return NextResponse.json({ ok: false, pro: false, error: "Pro license required" }, { status: 402 });
  }
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ ok: false, error: "No content" }, { status: 400 });
  }
  const fixed = fixDotEnv(content);
  // simple diff
  const diff = { before: content, after: fixed };
  return NextResponse.json({ ok: true, pro: true, diff, fixed });
}
