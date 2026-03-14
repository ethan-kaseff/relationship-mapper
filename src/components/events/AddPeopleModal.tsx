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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add People to Event</h2>
          <input
            type="text"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              {people.length === 0 ? "Everyone is already invited!" : "No matching people."}
            </p>
          ) : (
            filtered.map((p) => (
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
            ))
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
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
