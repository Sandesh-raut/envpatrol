'use client';

import { useState } from 'react';
import { scanEnv, type ScanIssue, recommendation } from '@/lib/scan';

export default function Home() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{score:number, issues:ScanIssue[], format:'dotenv'|'json'}|null>(null);
  const [busy, setBusy] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string>('');

  const onScan = () => {
    setBusy(true);
    try {
      const res = scanEnv(input);
      setResult(res);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setInput(text);
  };

  const badgeClass = (sev: string) => {
    return 'badge ' + (
      sev==='critical' ? 'badge-critical' :
      sev==='high' ? 'badge-high' :
      sev==='medium' ? 'badge-medium' :
      sev==='low' ? 'badge-low' :
      sev==='error_format' ? 'badge-critical' :
      'badge-medium'
    );
  };

  async function ensurePro(): Promise<boolean> {
    const key = licenseKey || prompt('Enter EnvPatrol Pro license key') || '';
    if (!key) return false;
    setLicenseKey(key);
    const r = await fetch('/api/pro/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ licenseKey: key })
    });
    const j = await r.json();
    if (!j?.ok) { alert('License not valid'); return false; }
    return true;
  }

  return (
    <main className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">EnvPatrol</h1>
        <p className="text-neutral-400">Scan your config locally in your browser. Nothing is uploaded on free scans.</p>
      </div>

      <div className="card space-y-4">
        <textarea
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          placeholder="Paste your .env or JSON config here"
          className="input h-56"
        />
        <div className="flex items-center gap-3">
          <label className="btn-alt cursor-pointer">
            <input type="file" accept=".env,.json,text/plain" className="hidden" onChange={onFile} />
            Upload file
          </label>
          <button className="btn" onClick={onScan} disabled={busy}>Scan</button>
        </div>
      </div>

      {result && (
        <div className="card mt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-neutral-400 text-sm">Security Score</div>
              <div className="score">{result.score}/100</div>
            </div>
            <div className="text-sm text-neutral-400">
              Issues found: <span className="font-semibold text-neutral-200">{result.issues.length}</span>
              <span className="ml-3">Format: <span className="font-semibold text-neutral-200">{result.format.toUpperCase()}</span></span>
            </div>
          </div>
          <hr />
          <ul className="space-y-4">
            {result.issues.map((iss, idx)=> (
              <li key={idx} className="flex items-start gap-3">
                <span className={badgeClass(iss.sev)}>{iss.sev.toUpperCase()}</span>
                <div className="flex-1">
                  <div className="font-mono text-sm">{iss.key}</div>
                  <div className="text-neutral-400 text-sm">
                    {iss.msg}
                    {iss.line ? ` (line ${iss.line})` : ''}
                    {iss.path ? ` [${iss.path}]` : ''}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-neutral-400">Recommendation: </span>
                    <span className="text-neutral-200">{recommendation(iss)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex gap-3 flex-wrap">
            <button className="btn-alt" onClick={async ()=>{
              if (!(await ensurePro())) return;
              if (!input.trim()) { alert('Paste content first'); return; }
              const r = await fetch('/api/format-fix', {
                method: 'POST',
                headers: { 'content-type':'application/json' },
                body: JSON.stringify({ content: input, licenseKey })
              });
              if (r.status === 402) { alert('Pro required'); return; }
              const j = await r.json();
              if (j?.ok && j.fixed) {
                setInput(j.fixed);
                alert('Formatting fixed');
              } else {
                alert('Could not fix');
              }
            }}>Auto fix formatting (Pro)</button>

            <button className="btn-alt" onClick={async ()=>{
              if (!(await ensurePro())) return;
              alert('PDF export is a Pro feature. Wire your backend to generate a PDF and return a URL.');
            }}>Download PDF (Pro)</button>

            <button className="btn-alt" onClick={async ()=>{
              if (!(await ensurePro())) return;
              alert('History is a Pro feature. Wire to your backend.');
            }}>Save History (Pro)</button>
          </div>
        </div>
      )}
    </main>
  );
}