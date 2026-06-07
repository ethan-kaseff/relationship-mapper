"use client";

import { useState } from "react";
import Link from "next/link";

interface EventSummary {
  id: string;
  title: string;
  eventDate: string | null;
  location: string | null;
  inviteCount: number;
  yesCount: number;
}

interface Props {
  fundraiserId: string;
  event: EventSummary | null;
  onCreated: () => void;
}

export default function FundraiserEventSection({ fundraiserId, event, onCreated }: Props) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ eventDate: "", eventTime: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/fundraisers/${fundraiserId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventDate: form.eventDate || null,
        eventTime: form.eventTime || null,
        location: form.location || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to create event.");
      return;
    }
    setCreating(false);
    setForm({ eventDate: "", eventTime: "", location: "" });
    onCreated();
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-lg font-semibold text-indigo-900 mb-4">Linked Event</h2>

      {!event && !creating && (
        <div className="text-sm text-gray-500">
          <p className="mb-3">No event linked to this fundraiser yet.</p>
          <button
            onClick={() => setCreating(true)}
            className="text-indigo-600 hover:underline text-sm"
          >
            + Create Event
          </button>
        </div>
      )}

      {!event && creating && (
        <div className="space-y-3 max-w-xs">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Date <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 6:30 PM"
              value={form.eventTime}
              onChange={(e) => setForm((p) => ({ ...p, eventTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Venue name or address"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setCreating(false); setForm({ eventDate: "", eventTime: "", location: "" }); setError(null); }}
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

      {event && (
        <div className="space-y-4">
          <Link href={`/events/${event.id}`} className="text-indigo-600 hover:underline font-medium text-sm">
            {event.title} &rarr;
          </Link>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <div className="font-semibold text-gray-900">{event.inviteCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Invited</div>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <div className="font-semibold text-gray-900">{event.yesCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">Attending</div>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <div className="font-semibold text-gray-900">
                {event.eventDate
                  ? new Date(event.eventDate).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric" })
                  : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Date</div>
            </div>
          </div>

          {event.location && (
            <p className="text-xs text-gray-500">{event.location}</p>
          )}
        </div>
      )}
    </div>
  );
}
