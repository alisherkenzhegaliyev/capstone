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

function stripImages(entry: HistoryEntry): HistoryEntry {
  if (entry.feature !== "xray") return entry;
  return {
    ...entry,
    prediction: {
      ...entry.prediction,
      original_image: "",
      findings: entry.prediction.findings.map((f) => ({
        ...f,
        gradcam_image: null,
        gradcam_plus_image: null,
      })),
    },
  };
}

export function saveHistoryEntry(userEmail: string, entry: HistoryEntry) {
  if (!canUseStorage()) {
    return;
  }

  const slim = stripImages(entry);
  const nextEntries = [slim, ...getHistoryEntries(userEmail)].slice(0, MAX_HISTORY_ITEMS);
  try {
    window.localStorage.setItem(getHistoryStorageKey(userEmail), JSON.stringify(nextEntries));
  } catch {
    // Storage still full after stripping — drop oldest entry and retry once
    const trimmed = nextEntries.slice(0, -1);
    try {
      window.localStorage.setItem(getHistoryStorageKey(userEmail), JSON.stringify(trimmed));
    } catch {
      // Give up silently — history is non-critical
    }
  }
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
