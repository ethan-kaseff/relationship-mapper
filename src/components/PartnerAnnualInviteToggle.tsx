"use client";

import { useState } from "react";

interface AnnualEventType {
  id: string;
  name: string;
}

export default function PartnerAnnualInviteToggle({
  partnerId,
  initialTypeIds,
  allTypes,
}: {
  partnerId: string;
  initialTypeIds: string[];
  allTypes: AnnualEventType[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTypeIds);
  const [saving, setSaving] = useState(false);

  async function handleToggle(typeId: string) {
    const newIds = selectedIds.includes(typeId)
      ? selectedIds.filter((id) => id !== typeId)
      : [...selectedIds, typeId];
    setSelectedIds(newIds);

    setSaving(true);
    try {
      const res = await fetch(`/api/partners/${partnerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annualEventTypeIds: newIds }),
      });
      if (!res.ok) {
        setSelectedIds(selectedIds);
      }
    } catch {
      setSelectedIds(selectedIds);
    } finally {
      setSaving(false);
    }
  }

  if (allTypes.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-2">
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
