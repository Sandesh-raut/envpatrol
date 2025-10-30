'use client';

import { useState } from 'react';
import { scanEnv, type ScanIssue, recommendation } from '@/lib/scan';

export default function Home() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{score:number, issues:ScanIssue[], format:'dotenv'|'json'}|null>(null);
  const [busy, setBusy] = useState(false);

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
      'badge-medium' // warning_format
    );
  };

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

          <div className="mt-6 flex gap-3">
            <button className="btn-alt" onClick={async ()=>{
              const body = { html: `<h1>EnvPatrol Report</h1><p>Score: ${result.score}</p>` };
              const r = await fetch('/api/pdf', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(body)});
              const j = await r.json();
              if (j?.url) window.open(j.url, '_blank');
              else alert('PDF endpoint not configured. This is a stub.');
            }}>Download PDF (Pro)</button>

            <button className="btn-alt" onClick={()=>{
              alert('Save History is part of Pro. Wire to your API in production.');
            }}>Save History (Pro)</button>
          </div>
        </div>
      )}
    </main>
  );
}
