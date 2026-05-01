"use client";

import { useState, useEffect } from "react";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface AddPeopleModalProps {
  eventId: string;
  existingPeopleIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddPeopleModal({ eventId, existingPeopleIds, onClose, onAdded }: AddPeopleModalProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/people")
      .then((r) => r.json())
      .then((data) => {
        setPeople(
          data
            .filter((p: Person) => !existingPeopleIds.includes(p.id))
            .sort((a: Person, b: Person) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
        );
        setLoading(false);
      });
  }, [existingPeopleIds]);

  const filtered = people.filter((p) => {
    const name = `${p.firstName} ${p.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // Pre-fill create form from search term when switching to create mode
  function openCreateForm() {
    const parts = search.trim().split(/\s+/);
    setNewFirst(parts[0] || "");
    setNewLast(parts.slice(1).join(" ") || "");
    setCreateError(null);
    setShowCreate(true);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSubmitting(true);
    await fetch(`/api/events/${eventId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peopleIds: Array.from(selected) }),
    });
    onAdded();
    onClose();
  }

  async function handleCreate() {
    if (!newFirst.trim() || !newLast.trim()) {
      setCreateError("First and last name are required.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: newFirst.trim(), lastName: newLast.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setCreateError(body.error || "Failed to create person.");
      setCreating(false);
      return;
    }
    const newPerson: Person = await res.json();
    await fetch(`/api/events/${eventId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peopleIds: [newPerson.id] }),
    });
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add People to Event</h2>
          {!showCreate && (
            <input
              type="text"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          )}
        </div>

        {showCreate ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <p className="text-sm text-gray-600">Create a new person and add them to this event.</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={newFirst}
                  onChange={(e) => setNewFirst(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={newLast}
                  onChange={(e) => setNewLast(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                />
              </div>
            </div>
            {createError && <p className="text-xs text-red-600">{createError}</p>}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  {people.length === 0 ? "Everyone is already invited!" : "No matching people."}
                </p>
                <button
                  onClick={openCreateForm}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Create new person
                </button>
              </div>
            ) : (
              <>
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
                <div className="px-3 pt-2 pb-1 border-t mt-2">
                  <button
                    onClick={openCreateForm}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    + Create new person
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={() => { if (showCreate) { setShowCreate(false); } else { onClose(); } }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
          >
            {showCreate ? "Back" : "Cancel"}
          </button>
          {showCreate ? (
            <button
              onClick={handleCreate}
              disabled={creating || !newFirst.trim() || !newLast.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create & Add"}
            </button>
          ) : (
            <button
              onClick={handleAdd}
              disabled={selected.size === 0 || submitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
            >
              {submitting ? "Adding..." : `Add ${selected.size} ${selected.size === 1 ? "Person" : "People"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
