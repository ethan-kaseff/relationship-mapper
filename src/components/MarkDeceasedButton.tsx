"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MarkDeceasedButtonProps {
  personId: string;
  personName: string;
  isDeceased: boolean;
  deceasedDate: string | null;
  forwardingEmail: string | null;
}

export default function MarkDeceasedButton({
  personId,
  personName,
  isDeceased,
  deceasedDate,
  forwardingEmail,
}: MarkDeceasedButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(
    deceasedDate ? new Date(deceasedDate).toISOString().split("T")[0] : ""
  );
  const [email, setEmail] = useState(forwardingEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/people/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isDeceased: true,
        deceasedDate: date ? new Date(date).toISOString() : null,
        forwardingEmail: email || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to save.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function handleMarkLiving() {
    if (!confirm(`Mark ${personName} as living again? This will clear the deceased date and forwarding email.`)) return;
    setSaving(true);
    await fetch(`/api/people/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDeceased: false, deceasedDate: null, forwardingEmail: null }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      {isDeceased ? (
        <button
          onClick={handleMarkLiving}
          disabled={saving}
          className="px-4 py-2 text-sm border border-gray-400 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Mark as Living"}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Mark as Deceased
        </button>
      )}

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Mark {personName} as Deceased</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Death <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forwarding Email <span className="text-gray-400 font-normal">(optional — for family notifications)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="family@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
