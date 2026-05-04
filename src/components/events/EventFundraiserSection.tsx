"use client";

import { useState } from "react";
import Link from "next/link";

interface FundraiserSummary {
  id: string;
  title: string;
  goalAmount: number;
  currentAmount: number;
  pendingCount: number;
}

interface Props {
  eventId: string;
  eventTitle: string;
  ticketPrice: number | null;
  rsvpYesCount: number;
  fundraiser: FundraiserSummary | null;
  onCreated: () => void;
}

function formatDollars(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default function EventFundraiserSection({ eventId, ticketPrice, rsvpYesCount, fundraiser, onCreated }: Props) {
  const [creating, setCreating] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ticketRevenue = ticketPrice ? ticketPrice * rsvpYesCount : 0;
  const donationTotal = fundraiser?.currentAmount ?? 0;
  const combinedTotal = ticketRevenue + donationTotal;
  const goal = fundraiser?.goalAmount ?? 0;
  const pct = goal > 0 ? Math.min(100, Math.round((combinedTotal / goal) * 100)) : null;

  async function handleCreate() {
    setSaving(true);
    setError(null);
    const goalCents = goalInput ? Math.round(parseFloat(goalInput) * 100) : 0;
    const res = await fetch(`/api/events/${eventId}/fundraiser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalAmount: goalCents }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to create fundraiser.");
      return;
    }
    setCreating(false);
    setGoalInput("");
    onCreated();
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-lg font-semibold text-indigo-900 mb-4">Fundraiser</h2>

      {!fundraiser && !creating && (
        <div className="text-sm text-gray-500">
          <p className="mb-3">No fundraiser linked to this event yet.</p>
          <button
            onClick={() => setCreating(true)}
            className="text-indigo-600 hover:underline text-sm"
          >
            + Create Fundraiser
          </button>
        </div>
      )}

      {!fundraiser && creating && (
        <div className="space-y-3 max-w-xs">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fundraising Goal <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setCreating(false); setGoalInput(""); setError(null); }}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {fundraiser && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Link href={`/fundraisers/${fundraiser.id}`} className="text-indigo-600 hover:underline font-medium text-sm">
              {fundraiser.title} &rarr;
            </Link>
            {fundraiser.pendingCount > 0 && (
              <Link
                href={`/fundraisers/${fundraiser.id}`}
                className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-0.5 rounded-full hover:bg-yellow-200"
              >
                {fundraiser.pendingCount} pending approval{fundraiser.pendingCount !== 1 ? "s" : ""}
              </Link>
            )}
          </div>

          {/* Combined total */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <div className="font-semibold text-gray-900">{formatDollars(combinedTotal)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total Raised</div>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <div className="font-semibold text-gray-900">{formatDollars(ticketRevenue)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Ticket Revenue</div>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <div className="font-semibold text-gray-900">{formatDollars(donationTotal)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Donations</div>
            </div>
          </div>

          {/* Progress bar */}
          {goal > 0 && pct !== null && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{pct}% of goal</span>
                <span>{formatDollars(goal)} goal</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
