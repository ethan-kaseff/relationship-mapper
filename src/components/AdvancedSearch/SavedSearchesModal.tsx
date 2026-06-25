"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { X, Bookmark, Search, Trash2 } from "lucide-react";

type SavedSearchItem = { id: string; name: string; filters: unknown };

// Show the filter box once the list is longer than this many entries.
const FILTER_THRESHOLD = 6;

export default function SavedSearchesModal({
  searches,
  onLoad,
  onDelete,
  onClose,
}: {
  searches: SavedSearchItem[];
  onLoad: (s: SavedSearchItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const showFilter = searches.length > FILTER_THRESHOLD;

  const visible = useMemo(() => {
    const sorted = [...searches].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((s) => s.name.toLowerCase().includes(q)) : sorted;
  }, [searches, query]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-semibold text-indigo-900">Saved searches</h2>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                Select one to load it into your search.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {showFilter && (
            <div className="px-5 pt-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter saved searches…"
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="p-2 max-h-80 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                {searches.length === 0 ? "No saved searches yet." : "No matches."}
              </p>
            ) : (
              visible.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-md hover:bg-gray-50"
                >
                  <button
                    onClick={() => {
                      onLoad(s);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 flex-1 text-left px-3 py-2.5 min-w-0"
                  >
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-800 truncate">{s.name}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete saved search "${s.name}"?`)) {
                        onDelete(s.id);
                      }
                    }}
                    aria-label={`Delete ${s.name}`}
                    title="Delete"
                    className="text-gray-400 hover:text-red-500 transition-colors px-3 py-2.5 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
