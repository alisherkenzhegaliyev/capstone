import { apiClient } from "./client";
import type { HistoryEntry } from "../types/history";

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const { data } = await apiClient.get<HistoryEntry[]>("/history");
  return data;
}

export async function fetchHistoryEntry(predictionId: string): Promise<HistoryEntry> {
  const { data } = await apiClient.get<HistoryEntry>(`/history/${predictionId}`);
  return data;
}
