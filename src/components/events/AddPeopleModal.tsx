"use client";

import { useState, useEffect } from "react";
import AdvancedSearchPanel from "@/components/AdvancedSearch/AdvancedSearchPanel";
import InviteOptionsPanel from "./InviteOptionsPanel";

interface DietaryOptionRecord { id: string; name: string; }

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

interface AddPeopleModalProps {
  eventId: string;
  existingPeopleIds: string[];
  groups: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddPeopleModal({ eventId, existingPeopleIds, groups, onClose, onAdded }: AddPeopleModalProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);

  const [rsvpStatus, setRsvpStatus] = useState("YES");
  const [meal, setMeal] = useState("Standard");
  const [dietary, setDietary] = useState<string[]>([]);
  const [ticketType, setTicketType] = useState("Regular");
  const [seatingRequest, setSeatingRequest] = useState("");
  const [tableRequest, setTableRequest] = useState("");
  const [customDietary, setCustomDietary] = useState<DietaryOptionRecord[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lookup/dietary-options").then((r) => r.json()).then((d) => setCustomDietary(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

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

  function selectAll() {
    setSelected(new Set(filtered.map((p) => p.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  // Pre-fill create form from search term when switching to create mode
  function openCreateForm() {
    const parts = search.trim().split(/\s+/);
    setNewFirst(parts[0] || "");
    setNewLast(parts.slice(1).join(" ") || "");
    setCreateError(null);
    setShowCreate(true);
  }

  const invitePayload = { rsvpStatus, meal, dietary, ticketType, seatingRequest: seatingRequest.trim() || null, tableRequest: tableRequest.trim() || null };

  async function handleAdd() {
    if (selected.size === 0) return;
    setSubmitting(true);
    await fetch(`/api/events/${eventId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peopleIds: Array.from(selected), ...invitePayload }),
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
      body: JSON.stringify({ peopleIds: [newPerson.id], ...invitePayload }),
    });
    onAdded();
    onClose();
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  if (advancedMode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
          <div className="p-4 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Add People to Event — Advanced Search</h2>
          </div>
          <AdvancedSearchPanel
            mode="modal"
            existingPeopleIds={existingPeopleIds}
            onAdd={async (ids) => {
              await fetch(`/api/events/${eventId}/invites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ peopleIds: ids, ...invitePayload }),
              });
              onAdded();
              onClose();
            }}
            onBack={() => setAdvancedMode(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add People to Event</h2>
            <button
              onClick={() => setAdvancedMode(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 px-2 py-1 rounded-md hover:bg-indigo-50"
            >
              Advanced Search
            </button>
          </div>
          {!showCreate && (
            <>
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
            </>
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

        <div className="border-t px-4 pt-3 pb-4 space-y-2.5">
          <InviteOptionsPanel
            rsvpStatus={rsvpStatus} onRsvpChange={setRsvpStatus}
            meal={meal} onMealChange={setMeal}
            dietary={dietary} onDietaryChange={setDietary}
            ticketType={ticketType} onTicketTypeChange={setTicketType}
            seatingRequest={seatingRequest} onSeatingRequestChange={setSeatingRequest}
            tableRequest={tableRequest} onTableRequestChange={setTableRequest}
            groups={groups}
            customDietary={customDietary}
          />
          <div className="flex gap-3 pt-1">
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
    </div>
  );
}
