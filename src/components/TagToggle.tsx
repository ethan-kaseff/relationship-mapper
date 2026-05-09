"use client";

import { useState } from "react";

interface Tag { id: string; name: string; }

interface TagToggleProps {
  entityId: string;
  entityType: "person" | "partner" | "partnerRole";
  initialTagIds: string[];
  allTags: Tag[];
}

export default function TagToggle({ entityId, entityType, initialTagIds, allTags }: TagToggleProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTagIds);
  const [saving, setSaving] = useState(false);

  function getEndpoint() {
    if (entityType === "person") return `/api/people/${entityId}`;
    if (entityType === "partner") return `/api/partners/${entityId}`;
    return `/api/partner-roles/${entityId}`;
  }

  function getMethod() {
    return entityType === "partnerRole" ? "PATCH" : "PUT";
  }

  async function handleToggle(tagId: string) {
    const newIds = selectedIds.includes(tagId)
      ? selectedIds.filter((id) => id !== tagId)
      : [...selectedIds, tagId];
    setSelectedIds(newIds);

    setSaving(true);
    try {
      const res = await fetch(getEndpoint(), {
        method: getMethod(),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: newIds }),
      });
      if (!res.ok) setSelectedIds(selectedIds);
    } catch {
      setSelectedIds(selectedIds);
    } finally {
      setSaving(false);
    }
  }

  if (allTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {allTags.map((tag) => (
        <label key={tag.id} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={selectedIds.includes(tag.id)}
            onChange={() => handleToggle(tag.id)}
            disabled={saving}
            className="accent-indigo-600 w-3.5 h-3.5"
          />
          <span className="text-xs text-gray-600">{tag.name}</span>
        </label>
      ))}
    </div>
  );
}
