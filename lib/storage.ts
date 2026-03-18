import { HistoryRecord, ParsedJD } from './types';

const HISTORY_KEY = 'resume_tailor_history';
const API_KEY_KEY = 'resume_tailor_api_key';
const PARSED_JDS_KEY = 'resume_tailor_parsed_jds';
const CURRENT_RESUME_KEY = 'resume_tailor_current_resume';

export function getHistory(): HistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: HistoryRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

export function addHistoryRecord(record: HistoryRecord): void {
  const history = getHistory();
  const existing = history.findIndex((r) => r.id === record.id);
  if (existing >= 0) {
    history[existing] = record;
  } else {
    history.unshift(record);
  }
  saveHistory(history);
}

export function deleteHistoryRecord(id: string): void {
  const history = getHistory().filter((r) => r.id !== id);
  saveHistory(history);
}

export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(API_KEY_KEY) || '';
}

export function saveApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_KEY_KEY, key);
}

export function getParsedJDs(): ParsedJD[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PARSED_JDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveParsedJD(jd: ParsedJD): void {
  const jds = getParsedJDs();
  jds.unshift(jd);
  if (jds.length > 20) jds.pop();
  localStorage.setItem(PARSED_JDS_KEY, JSON.stringify(jds));
}

export function getCurrentResume(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CURRENT_RESUME_KEY) || '';
}

export function saveCurrentResume(content: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_RESUME_KEY, content);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
