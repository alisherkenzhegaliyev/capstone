import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { clearHistoryEntries, getHistoryEntries } from "../lib/history";
import type { HistoryEntry } from "../types/history";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function getEntryTitle(entry: HistoryEntry) {
  if (entry.feature === "xray") {
    return entry.prediction.filename;
  }
  if (entry.feature === "chd") {
    return `CHD risk ${(entry.result.probability * 100).toFixed(1)}%`;
  }
  return `Readmission risk ${(entry.result.probability * 100).toFixed(1)}%`;
}

function getEntrySubtitle(entry: HistoryEntry) {
  if (entry.feature === "xray") {
    const flagged = entry.prediction.findings.filter(
      (finding) => finding.probability >= entry.prediction.threshold
    ).length;
    return `${entry.prediction.status} • ${flagged} flagged finding${flagged === 1 ? "" : "s"}`;
  }
  if (entry.feature === "chd") {
    return `${entry.result.risk_level} risk • age ${entry.input.age} • SBP ${entry.input.systolic_bp}`;
  }
  return `${entry.result.risk_level} risk • ${entry.input.age_bracket} • ${entry.input.time_in_hospital} days in hospital`;
}

function getDestination(entry: HistoryEntry) {
  return entry.feature === "xray" ? "/" : "/clinical";
}

function getFeatureLabel(entry: HistoryEntry) {
  if (entry.feature === "xray") {
    return "Chest X-ray";
  }
  if (entry.feature === "chd") {
    return "CHD";
  }
  return "Readmission";
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!user?.email) {
      setEntries([]);
      return;
    }

    setEntries(getHistoryEntries(user.email));
  }, [user?.email]);

  const handleClearHistory = () => {
    if (!user?.email) {
      return;
    }

    clearHistoryEntries(user.email);
    setEntries([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/")}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back to Home
          </button>
          <h1 className="text-lg font-bold text-slate-900">History</h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-slate-500 md:block">{user?.email}</span>
            <button
              onClick={logout}
              className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Saved Analyses</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recent X-ray and clinical decision support runs are stored locally on this device.
            </p>
          </div>
          <button
            onClick={handleClearHistory}
            disabled={entries.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear History
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No history yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Run an X-ray upload or a clinical assessment and it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                        {getFeatureLabel(entry)}
                      </span>
                      <span className="text-xs text-slate-400">{formatTimestamp(entry.createdAt)}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{getEntryTitle(entry)}</h3>
                    <p className="mt-1 text-sm text-slate-500">{getEntrySubtitle(entry)}</p>
                  </div>

                  <button
                    onClick={() =>
                      navigate(getDestination(entry), {
                        state: { selectedEntry: entry },
                      })
                    }
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Open Result
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
