"use client";

import { useState } from "react";

interface Candidate {
  id: string;
  title: string;
  eventDate: string | null;
  tableCount: number;
}

export default function ReuseLayoutButton({
  eventId,
  onImported,
}: {
  eventId: string;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function openPicker() {
    setOpen(true);
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/seating/copy-layout`);
      const data = await res.json();
      setCandidates(Array.isArray(data) ? data : []);
    } catch {
      setError("Couldn't load other events.");
    } finally {
      setLoading(false);
    }
  }

  async function useLayout(source: Candidate) {
    if (!confirm(`Use the layout from "${source.title}"?\n\nThis replaces the current room and tables, and unseats every guest on this event (their names stay on the guest list — they just return to the unassigned pool).`)) {
      return;
    }
    setImportingId(source.id);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/seating/copy-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceEventId: source.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to copy layout");
        setImportingId(null);
        return;
      }
      setOpen(false);
      setImportingId(null);
      onImported();
    } catch {
      setError("Failed to copy layout");
      setImportingId(null);
    }
  }

  return (
    <>
      <button
        onClick={openPicker}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-indigo-300 text-indigo-700 rounded-md hover:bg-indigo-50"
        title="Reuse the room and tables from a previous event"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3m-7-6V5a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-3" />
        </svg>
        Use another event&apos;s layout
      </button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Use another event&apos;s layout</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <p className="text-gray-500 text-sm text-center py-8">Loading…</p>
              ) : candidates.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No other events have a saved layout yet.</p>
              ) : (
                candidates.map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {c.title}
                        {idx === 0 && <span className="ml-2 text-xs font-normal text-indigo-600">most recent</span>}
                      </div>
                      <div className="text-xs text-gray-400">
                        {c.eventDate ? new Date(c.eventDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "No date"} · {c.tableCount} table{c.tableCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => useLayout(c)}
                      disabled={importingId !== null}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {importingId === c.id ? "Copying…" : "Use this"}
                    </button>
                  </div>
                ))
              )}
              {error && <p className="text-sm text-red-600 px-3 py-2">{error}</p>}
            </div>
            <div className="p-3 border-t">
              <button onClick={() => setOpen(false)} className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
