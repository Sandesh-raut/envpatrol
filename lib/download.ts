
export function downloadBlob(filename: string, mime: string, content: string | Blob) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function openHTMLInNewTab(html: string, title = 'EnvPatrol Report') {
  const w = window.open('', '_blank');
  if (!w) return alert('Popup blocked. Please allow popups to view the report.');
  w.document.open();
  w.document.write(html);
  w.document.title = title;
  w.document.close();
}
