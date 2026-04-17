import type { HistoryEntry } from "../types/history";

const HISTORY_STORAGE_PREFIX = "capstone-history";
const MAX_HISTORY_ITEMS = 25;

function getHistoryStorageKey(userEmail: string) {
  return `${HISTORY_STORAGE_PREFIX}:${userEmail.toLowerCase()}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getHistoryEntries(userEmail: string): HistoryEntry[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getHistoryStorageKey(userEmail));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(userEmail: string, entry: HistoryEntry) {
  if (!canUseStorage()) {
    return;
  }

  const nextEntries = [entry, ...getHistoryEntries(userEmail)].slice(0, MAX_HISTORY_ITEMS);
  window.localStorage.setItem(getHistoryStorageKey(userEmail), JSON.stringify(nextEntries));
}

export function clearHistoryEntries(userEmail: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(getHistoryStorageKey(userEmail));
}

export function createHistoryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
