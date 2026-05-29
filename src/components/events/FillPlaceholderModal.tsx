"use client";

import { useState, useEffect } from "react";
import InviteOptionsPanel from "./InviteOptionsPanel";

interface Person { id: string; firstName: string; lastName: string; }
interface DietaryOptionRecord { id: string; name: string; }

interface FillPlaceholderModalProps {
  eventId: string;
  inviteId: string;
  existingPeopleIds: string[];
  groups: string[];
  onClose: () => void;
  onFilled: () => void;
}

export default function FillPlaceholderModal({ eventId, inviteId, existingPeopleIds, groups, onClose, onFilled }: FillPlaceholderModalProps) {
  const [mode, setMode] = useState<"person" | "guest">("person");
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Person | null>(null);
  const [guestFirst, setGuestFirst] = useState("");
  const [guestLast, setGuestLast] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [rsvpStatus, setRsvpStatus] = useState("YES");
  const [meal, setMeal] = useState("Standard");
  const [dietary, setDietary] = useState<string[]>([]);
  const [ticketType, setTicketType] = useState("Regular");
  const [seatingRequest, setSeatingRequest] = useState("");
  const [tableRequest, setTableRequest] = useState("");
  const [customDietary, setCustomDietary] = useState<DietaryOptionRecord[]>([]);

  useEffect(() => {
    fetch("/api/lookup/dietary-options").then((r) => r.json()).then((d) => setCustomDietary(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/people")
      .then((r) => r.json())
      .then((data: Person[]) => {
        setPeople(
          data
            .filter((p) => p.id && !existingPeopleIds.includes(p.id))
            .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
        );
        setLoading(false);
      });
  }, [existingPeopleIds]);

  const filtered = people.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      `${p.lastName}, ${p.firstName}`.toLowerCase().includes(q);
  });

  async function handleSubmit() {
    setError("");
    if (mode === "person" && !selected) return;
    if (mode === "guest" && (!guestFirst.trim() || !guestLast.trim())) {
      setError("First and last name are required.");
      return;
    }
    setSubmitting(true);
    const inviteOptions = {
      rsvpStatus, meal, dietary, ticketType,
      seatingRequest: seatingRequest.trim() || null,
      tableRequest: tableRequest.trim() || null,
    };
    try {
      const body = mode === "person"
        ? { peopleId: selected!.id, ...inviteOptions }
        : { guestName: `${guestFirst.trim()} ${guestLast.trim()}`, isGuest: true, ...inviteOptions };

      const res = await fetch(`/api/events/${eventId}/invites/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update invite");
        setSubmitting(false);
        return;
      }
      onFilled();
      onClose();
    } catch {
      setError("Failed to update invite");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Fill Placeholder</h2>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setMode("person"); setSelected(null); setSearch(""); setError(""); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md border ${mode === "person" ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
            >
              Existing Person
            </button>
            <button
              onClick={() => { setMode("guest"); setSelected(null); setError(""); }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md border ${mode === "guest" ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
            >
              Guest Name
            </button>
          </div>
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-2 mt-2 text-xs">{error}</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {mode === "person" ? (
            <>
              <div className="px-4 pt-3 pb-2">
                <input
                  type="text"
                  placeholder="Search people..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="px-2 pb-2">
                {loading ? (
                  <p className="text-gray-500 text-sm text-center py-6">Loading...</p>
                ) : filtered.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">No matching people.</p>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-50 ${selected?.id === p.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-900"}`}
                    >
                      {p.lastName}, {p.firstName}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="p-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={guestFirst}
                    onChange={(e) => setGuestFirst(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={guestLast}
                    onChange={(e) => setGuestLast(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-4 pt-3 pb-4 space-y-2.5 flex-shrink-0">
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
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (mode === "person" && !selected) || (mode === "guest" && (!guestFirst.trim() || !guestLast.trim()))}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Assign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
