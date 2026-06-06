"use client";

import { useState, useRef, useEffect } from "react";

interface Tag { id: string; name: string; }

interface TagToggleProps {
  entityId: string;
  entityType: "person" | "partner" | "partnerRole";
  initialTagIds: string[];
  allTags: Tag[];
  readOnly?: boolean;
}

export default function TagToggle({ entityId, entityType, initialTagIds, allTags, readOnly = false }: TagToggleProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTagIds);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  function getEndpoint() {
    if (entityType === "person") return `/api/people/${entityId}`;
    if (entityType === "partner") return `/api/partners/${entityId}`;
    return `/api/partner-roles/${entityId}`;
  }

  function getMethod() {
    return entityType === "partnerRole" ? "PATCH" : "PUT";
  }

  async function saveTagIds(newIds: string[]) {
    setSaving(true);
    try {
      const res = await fetch(getEndpoint(), {
        method: getMethod(),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: newIds }),
      });
      if (!res.ok) return false;
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(tagId: string) {
    const prev = selectedIds;
    const newIds = selectedIds.filter((id) => id !== tagId);
    setSelectedIds(newIds);
    const ok = await saveTagIds(newIds);
    if (!ok) setSelectedIds(prev);
  }

  async function handleAdd(tagId: string) {
    const prev = selectedIds;
    const newIds = [...selectedIds, tagId];
    setSelectedIds(newIds);
    setShowPicker(false);
    const ok = await saveTagIds(newIds);
    if (!ok) setSelectedIds(prev);
  }

  const selectedTags = allTags.filter((t) => selectedIds.includes(t.id));
  const availableTags = allTags.filter((t) => !selectedIds.includes(t.id));

  if (allTags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" ref={pickerRef}>
      {selectedTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full"
        >
          {tag.name}
          {!readOnly && (
            <button
              onClick={() => handleRemove(tag.id)}
              disabled={saving}
              className="text-indigo-400 hover:text-indigo-700 leading-none disabled:opacity-50"
              aria-label={`Remove ${tag.name}`}
            >
              ×
            </button>
          )}
        </span>
      ))}

      {!readOnly && availableTags.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            disabled={saving}
            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium px-1.5 py-0.5 rounded border border-indigo-300 hover:border-indigo-500 transition-colors disabled:opacity-50"
          >
            + Add tag
          </button>
          {showPicker && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-wrap gap-1.5 min-w-[160px] max-w-xs">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAdd(tag.id)}
                  className="inline-flex items-center bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full transition-colors"
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
