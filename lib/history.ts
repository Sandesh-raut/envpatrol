
import type { ScanIssue } from '@/lib/scan';

const KEY = 'envpatrol_history_v1';

export type HistoryItem = {
  ts: number;
  score: number;
  format: 'dotenv'|'json';
  issues: ScanIssue[];
  sample: string;
};

export function saveHistory(item: HistoryItem) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: HistoryItem[] = raw ? JSON.parse(raw) : [];
    arr.unshift(item);
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 50)));
    return true;
  } catch {
    return false;
  }
}

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearHistory() {
  try { localStorage.removeItem(KEY); } catch {}
}
