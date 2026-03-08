"use client";

import { useState } from "react";

export default function PartnerAnnualInviteToggle({
  partnerId,
  initialValue,
}: {
  partnerId: string;
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    const newValue = !checked;
    setChecked(newValue);

    setSaving(true);
    try {
      const res = await fetch(`/api/partners/${partnerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annualInvite: newValue }),
      });
      if (!res.ok) {
        setChecked(!newValue);
      }
    } catch {
      setChecked(!newValue);
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleToggle}
        disabled={saving}
        className="accent-indigo-600 w-3.5 h-3.5"
      />
      <span className="text-xs text-gray-500">Annual Invite</span>
    </label>
  );
}
