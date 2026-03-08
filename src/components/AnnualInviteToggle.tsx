"use client";

import { useState } from "react";

export default function AnnualInviteToggle({
  roleId,
  initialValue,
}: {
  roleId: string;
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    const newValue = !checked;
    setChecked(newValue); // optimistic

    setSaving(true);
    try {
      const res = await fetch(`/api/partner-roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annualInvite: newValue }),
      });
      if (!res.ok) {
        setChecked(!newValue); // revert
      }
    } catch {
      setChecked(!newValue); // revert
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-1.5 ml-3 cursor-pointer select-none">
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
