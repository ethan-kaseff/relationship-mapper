"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import AddPeopleModal from "./AddPeopleModal";
import AddFromPartnerModal from "./AddFromPartnerModal";
import Pagination, { usePagination } from "../Pagination";

function BlurInput({
  value: externalValue,
  onCommit,
  ...props
}: { value: string; onCommit: (val: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur">) {
  const [localValue, setLocalValue] = useState(externalValue);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current) setLocalValue(externalValue);
  }, [externalValue]);

  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => { dirtyRef.current = true; setLocalValue(e.target.value); }}
      onBlur={() => {
        if (dirtyRef.current && localValue !== externalValue) {
          onCommit(localValue);
        }
        dirtyRef.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}

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
  ccConnected?: boolean;
  syncing?: boolean;
  syncResult?: string | null;
  onSyncCC?: () => void;
  tableNames?: Record<string, string>;
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

export default function InviteManager({ eventId, invites, trackMeals, trackSeating, onRefresh, ccConnected, syncing, syncResult, onSyncCC, tableNames = {} }: InviteManagerProps) {
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const distinctGroups = useMemo(() =>
    Array.from(new Set(invites.map((i) => i.group).filter(Boolean))).sort(),
    [invites]
  );

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
        case "seated": {
          const aName = a.tableId ? (tableNames[a.tableId] || "") : "";
          const bName = b.tableId ? (tableNames[b.tableId] || "") : "";
          cmp = (a.tableId ? 0 : 1) - (b.tableId ? 0 : 1) || aName.localeCompare(bName);
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const { currentPage, pageSize, startIndex, endIndex, setCurrentPage, setPageSize } =
    usePagination(filtered.length);
  const paginated = filtered.slice(startIndex, endIndex);

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
      {/* Search, filters, and action buttons */}
      <div className="flex gap-3 mb-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="Search invitees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[12rem] max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
        <div className="ml-auto flex gap-2 items-center">
          {syncResult && (
            <span className="text-sm text-gray-600">{syncResult}</span>
          )}
          {ccConnected && onSyncCC && (
            <button
              onClick={onSyncCC}
              disabled={syncing}
              className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-md hover:bg-indigo-50 disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync to CC"}
            </button>
          )}
          <button
            onClick={() => {
              const headers = ["Last Name", "First Name", "RSVP", "Group", ...(trackMeals ? ["Meal"] : []), ...(trackSeating ? ["Table"] : [])];
              const rows = filtered.map((inv) => [
                inv.person.lastName,
                inv.person.firstName,
                inv.rsvpStatus,
                inv.group || "",
                ...(trackMeals ? [inv.meal] : []),
                ...(trackSeating ? [inv.tableId ? (tableNames[inv.tableId] || "Seated") : ""] : []),
              ]);
              const csvContent = [headers, ...rows]
                .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `invites-${filter.toLowerCase()}${search ? `-${search}` : ""}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={filtered.length === 0}
            className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowAddPartner(true)}
            className="border border-indigo-300 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-50 text-sm"
          >
            + From Partner
          </button>
          <button
            onClick={() => setShowAddPeople(true)}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm"
          >
            + Add People
          </button>
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
              {trackSeating && <th className="text-left px-4 py-3 font-semibold text-indigo-900 cursor-pointer hover:text-indigo-700 select-none" onClick={() => handleSort("seated")}>Table{sortIndicator("seated")}</th>}
              <th className="text-right px-4 py-3 font-semibold text-indigo-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((inv) => (
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
                  <BlurInput
                    type="text"
                    list="group-suggestions"
                    value={inv.group}
                    onCommit={(val) => updateGroup(inv.id, val)}
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
                      <span className="text-green-600 text-xs font-medium">{tableNames[inv.tableId] || "Seated"}</span>
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
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      <datalist id="group-suggestions">
        {distinctGroups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

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
