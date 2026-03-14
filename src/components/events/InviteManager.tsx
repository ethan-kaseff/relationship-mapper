"use client";

import { useState } from "react";
import AddPeopleModal from "./AddPeopleModal";
import AddFromPartnerModal from "./AddFromPartnerModal";

interface EventInvite {
  id: string;
  peopleId: string;
  rsvpStatus: string;
  meal: string;
  dietary: string[];
  notes: string | null;
  group: string;
  tableId: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface InviteManagerProps {
  eventId: string;
  invites: EventInvite[];
  trackMeals: boolean;
  trackSeating: boolean;
  onRefresh: () => void;
}

const RSVP_COLORS: Record<string, string> = {
  YES: "bg-green-100 text-green-700 border-green-200",
  NO: "bg-red-100 text-red-700 border-red-200",
  MAYBE: "bg-yellow-100 text-yellow-700 border-yellow-200",
  PENDING: "bg-gray-100 text-gray-700 border-gray-200",
};

type SortKey = "name" | "rsvp" | "group" | "meal" | "seated";
type SortDir = "asc" | "desc";

const RSVP_ORDER: Record<string, number> = { YES: 0, MAYBE: 1, PENDING: 2, NO: 3 };

export default function InviteManager({ eventId, invites, trackMeals, trackSeating, onRefresh }: InviteManagerProps) {
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  const filtered = invites
    .filter((inv) => {
      const matchesFilter = filter === "ALL" || inv.rsvpStatus === filter;
      const name = `${inv.person.firstName} ${inv.person.lastName}`.toLowerCase();
      const group = (inv.group || "").toLowerCase();
      const term = search.toLowerCase();
      const matchesSearch = name.includes(term) || group.includes(term);
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.person.lastName.localeCompare(b.person.lastName) || a.person.firstName.localeCompare(b.person.firstName);
          break;
        case "rsvp":
          cmp = (RSVP_ORDER[a.rsvpStatus] ?? 9) - (RSVP_ORDER[b.rsvpStatus] ?? 9);
          break;
        case "group":
          cmp = (a.group || "").localeCompare(b.group || "");
          break;
        case "meal":
          cmp = a.meal.localeCompare(b.meal);
          break;
        case "seated":
          cmp = (a.tableId ? 0 : 1) - (b.tableId ? 0 : 1);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  async function updateRsvp(inviteId: string, rsvpStatus: string) {
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvpStatus }),
    });
    onRefresh();
  }

  async function updateMeal(inviteId: string, meal: string) {
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meal }),
    });
    onRefresh();
  }

  async function updateGroup(inviteId: string, group: string) {
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group }),
    });
    onRefresh();
  }

  async function removeInvite(inviteId: string) {
    if (!confirm("Remove this person from the event?")) return;
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddPeople(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
          >
            + Add People
          </button>
          <button
            onClick={() => setShowAddPartner(true)}
            className="border border-indigo-300 text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-50 text-sm"
          >
            + From Partner
          </button>
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex gap-3 mb-4 items-center">
        <input
          type="text"
          placeholder="Search invitees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <div className="flex gap-1">
          {["ALL", "YES", "NO", "MAYBE", "PENDING"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                filter === f
                  ? f === "ALL"
                    ? "bg-indigo-100 text-indigo-700"
                    : RSVP_COLORS[f]
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              {f !== "ALL" && (
                <span className="ml-1">
                  ({invites.filter((i) => i.rsvpStatus === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Invite table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900 cursor-pointer hover:text-indigo-700 select-none" onClick={() => handleSort("name")}>Name{sortIndicator("name")}</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900 cursor-pointer hover:text-indigo-700 select-none" onClick={() => handleSort("rsvp")}>RSVP{sortIndicator("rsvp")}</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900 cursor-pointer hover:text-indigo-700 select-none" onClick={() => handleSort("group")}>Group{sortIndicator("group")}</th>
              {trackMeals && <th className="text-left px-4 py-3 font-semibold text-indigo-900 cursor-pointer hover:text-indigo-700 select-none" onClick={() => handleSort("meal")}>Meal{sortIndicator("meal")}</th>}
              {trackSeating && <th className="text-left px-4 py-3 font-semibold text-indigo-900 cursor-pointer hover:text-indigo-700 select-none" onClick={() => handleSort("seated")}>Seated{sortIndicator("seated")}</th>}
              <th className="text-right px-4 py-3 font-semibold text-indigo-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {inv.person.lastName}, {inv.person.firstName}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={inv.rsvpStatus}
                    onChange={(e) => updateRsvp(inv.id, e.target.value)}
                    className={`px-2 py-1 text-xs font-medium rounded border ${RSVP_COLORS[inv.rsvpStatus]}`}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                    <option value="MAYBE">Maybe</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={inv.group}
                    onChange={(e) => updateGroup(inv.id, e.target.value)}
                    placeholder="Group"
                    className="w-full min-w-[8rem] px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </td>
                {trackMeals && (
                  <td className="px-4 py-3">
                    <select
                      value={inv.meal}
                      onChange={(e) => updateMeal(inv.id, e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                    >
                      <option>Standard</option>
                      <option>Vegetarian</option>
                      <option>Vegan</option>
                      <option>Kosher</option>
                      <option>Halal</option>
                      <option>Gluten-Free</option>
                      <option>Kids Meal</option>
                    </select>
                  </td>
                )}
                {trackSeating && (
                  <td className="px-4 py-3">
                    {inv.tableId ? (
                      <span className="text-green-600 text-xs font-medium">Seated</span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeInvite(inv.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4 + (trackMeals ? 1 : 0) + (trackSeating ? 1 : 0)} className="px-4 py-8 text-center text-gray-400">
                  {invites.length === 0
                    ? "No invitees yet. Add people using the buttons above."
                    : "No matching invitees."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddPeople && (
        <AddPeopleModal
          eventId={eventId}
          existingPeopleIds={invites.map((i) => i.peopleId)}
          onClose={() => setShowAddPeople(false)}
          onAdded={onRefresh}
        />
      )}

      {showAddPartner && (
        <AddFromPartnerModal
          eventId={eventId}
          onClose={() => setShowAddPartner(false)}
          onAdded={onRefresh}
        />
      )}
    </div>
  );
}
