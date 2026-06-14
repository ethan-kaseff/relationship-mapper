"use client";

import { useState } from "react";

export interface NamedInvite {
  id: string;
  name: string;
  tableId: string | null;
}

// Shown when a seat reduction would drop below the number of named guests in a
// group. Staff pick exactly which named guests come off the invite list — we
// never auto-remove a real person. Used by both the donations "Using" editor and
// the Edit Donation modal's level change.
export default function SeatReducePicker({
  group,
  namedInvites,
  removeCount,
  targetSeats,
  selected,
  onToggle,
  onCancel,
  onConfirm,
}: {
  group: string;
  namedInvites: NamedInvite[];
  removeCount: number;
  targetSeats: number;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [copiedNames, setCopiedNames] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Reduce seats for {group}</h2>
            <button
              onClick={async () => {
                const text = namedInvites.map((i) => i.name).join("\n");
                try {
                  await navigator.clipboard.writeText(text);
                  setCopiedNames(true);
                  setTimeout(() => setCopiedNames(false), 2000);
                } catch { /* clipboard unavailable */ }
              }}
              className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-md px-2 py-1 hover:bg-indigo-50"
              title="Copy the current guest list to paste into an email or text"
            >
              {copiedNames ? "Copied!" : "Copy names"}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            This group has {namedInvites.length} named guest{namedInvites.length !== 1 ? "s" : ""}, but you&apos;re setting {targetSeats} seat{targetSeats !== 1 ? "s" : ""}. Choose {removeCount} to remove from the invite list.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {namedInvites.map((inv) => {
            const checked = selected.has(inv.id);
            const atCap = selected.size >= removeCount;
            return (
              <label key={inv.id} className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${checked ? "bg-red-50" : "hover:bg-gray-50"}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && atCap}
                  onChange={() => onToggle(inv.id)}
                  className="accent-red-600 disabled:opacity-40"
                />
                <span className="text-sm text-gray-800 flex-1">{inv.name}</span>
                {inv.tableId && <span className="text-xs text-amber-600">seated at a table</span>}
              </label>
            );
          })}
        </div>
        <div className="p-4 border-t">
          <p className="text-xs text-gray-500 mb-2">
            {selected.size} of {removeCount} selected. Any remaining TBD seats for this group will also be cleared.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
            <button
              onClick={onConfirm}
              disabled={selected.size !== removeCount}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
            >
              Remove {removeCount} &amp; save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
