"use client";

import { useState } from "react";

interface AnnualEventType {
  id: string;
  name: string;
}

export default function AnnualInviteToggle({
  roleId,
  initialTypeIds,
  allTypes,
}: {
  roleId: string;
  initialTypeIds: string[];
  allTypes: AnnualEventType[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTypeIds);
  const [saving, setSaving] = useState(false);

  async function handleToggle(typeId: string) {
    const newIds = selectedIds.includes(typeId)
      ? selectedIds.filter((id) => id !== typeId)
      : [...selectedIds, typeId];
    setSelectedIds(newIds); // optimistic

    setSaving(true);
    try {
      const res = await fetch(`/api/partner-roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annualEventTypeIds: newIds }),
      });
      if (!res.ok) {
        setSelectedIds(selectedIds); // revert
      }
    } catch {
      setSelectedIds(selectedIds); // revert
    } finally {
      setSaving(false);
    }
  }

  if (allTypes.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 ml-3">
      {allTypes.map((type) => (
        <label key={type.id} className="inline-flex items-center gap-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={selectedIds.includes(type.id)}
            onChange={() => handleToggle(type.id)}
            disabled={saving}
            className="accent-indigo-600 w-3.5 h-3.5"
          />
          <span className="text-xs text-gray-500">{type.name}</span>
        </label>
      ))}
    </div>
  );
}
