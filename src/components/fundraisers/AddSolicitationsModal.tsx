"use client";

import { useState, useEffect } from "react";

interface Tag {
  id: string;
  name: string;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  tags: { tagId: string }[];
}

interface AddSolicitationsModalProps {
  fundraiserId: string;
  existingPeopleIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddSolicitationsModal({ fundraiserId, existingPeopleIds, onClose, onAdded }: AddSolicitationsModalProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/people").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([peopleData, tagsData]) => {
      setPeople(
        peopleData
          .filter((p: Person) => p.status === "ACTIVE" && !existingPeopleIds.includes(p.id))
          .sort((a: Person, b: Person) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      );
      setTags(Array.isArray(tagsData) ? tagsData : []);
      setLoading(false);
    });
  }, [existingPeopleIds]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
    setSelected(new Set());
  }

  const filtered = people.filter((p) => {
    if (selectedTagIds.length > 0 && !selectedTagIds.every((tid) => p.tags.some((t) => t.tagId === tid))) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      `${p.lastName}, ${p.firstName}`.toLowerCase().includes(q);
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(filtered.map((p) => p.id))); }
  function clearAll() { setSelected(new Set()); }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSubmitting(true);
    await fetch(`/api/fundraisers/${fundraiserId}/solicitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peopleIds: Array.from(selected) }),
    });
    onAdded();
    onClose();
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add People to Ask List</h2>
          <input
            type="text"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            autoFocus
          />
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <label key={tag.id} className="inline-flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                    className="accent-indigo-600 w-3.5 h-3.5"
                  />
                  <span className="text-xs font-medium text-gray-700">{tag.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              {people.length === 0 ? "Everyone is already on the ask list!" : "No matching people."}
            </p>
          ) : (
            <>
              <div className="px-3 py-1.5 flex items-center justify-between border-b mb-1">
                <span className="text-xs text-gray-500">{filtered.length} people</span>
                <button
                  onClick={allFilteredSelected ? clearAll : selectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {allFilteredSelected ? "Deselect all" : "Select all"}
                </button>
              </div>
              {filtered.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-sm text-gray-900">
                    {p.lastName}, {p.firstName}
                  </span>
                </label>
              ))}
            </>
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || submitting}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
          >
            {submitting ? "Adding..." : `Add ${selected.size} ${selected.size === 1 ? "Person" : "People"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
