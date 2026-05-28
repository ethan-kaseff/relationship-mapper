"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import AddPeopleModal from "./AddPeopleModal";
import AddFromPartnerModal from "./AddFromPartnerModal";
import Pagination, { usePagination } from "../Pagination";
import { DIETARY_OPTIONS } from "@/lib/seating-constants";

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
  peopleId: string | null;
  rsvpStatus: string;
  meal: string;
  dietary: string[];
  notes: string | null;
  group: string;
  tableId: string | null;
  attended: boolean;
  isGuest: boolean;
  isPlaceholder: boolean;
  guestName: string | null;
  guestEmail: string | null;
  ticketType: string;
  seatingRequest: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
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

const TICKET_TYPES = ["Regular", "Comp", "Press", "Staff", "VIP"];

type SortKey = "name" | "rsvp" | "group" | "meal" | "seated" | "ticket";
type SortDir = "asc" | "desc";

const RSVP_ORDER: Record<string, number> = { YES: 0, MAYBE: 1, PENDING: 2, NO: 3 };

function getDisplayName(inv: EventInvite): string {
  if (inv.isPlaceholder) return "TBD";
  if (inv.isGuest && inv.guestName) return inv.guestName;
  if (inv.person) return `${inv.person.lastName}, ${inv.person.firstName}`;
  return "Unknown";
}

// Inline dietary popover
function DietaryCell({ inv, eventId, onRefresh }: { inv: EventInvite; eventId: string; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(inv.dietary || []);
  const ref = useRef<HTMLDivElement>(null);

  // sync when inv changes
  useEffect(() => {
    setSelected(inv.dietary || []);
  }, [inv.dietary]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function save(opts: string[]) {
    await fetch(`/api/events/${eventId}/invites/${inv.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dietary: opts }),
    });
    onRefresh();
  }

  function toggle(opt: string) {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    setSelected(next);
  }

  if (inv.dietary.length === 0 && !open) {
    return (
      <span
        className="text-gray-400 text-xs cursor-pointer hover:text-gray-600"
        onClick={() => setOpen(true)}
      >
        —
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
      >
        {inv.dietary.length} restriction{inv.dietary.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[180px]">
          <p className="text-xs font-semibold text-gray-700 mb-2">Dietary Restrictions</p>
          <div className="space-y-1">
            {DIETARY_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded text-indigo-600"
                />
                <span className="text-xs text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { save(selected); setOpen(false); }}
              className="flex-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Save
            </button>
            <button
              onClick={() => { setSelected(inv.dietary); setOpen(false); }}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {!open && inv.dietary.length === 0 && (
        <span
          className="text-gray-400 text-xs cursor-pointer hover:text-gray-600 ml-1"
          onClick={() => setOpen(true)}
        >
          + add
        </span>
      )}
    </div>
  );
}

// Add Guest modal
function AddGuestModal({ eventId, onClose, onAdded }: { eventId: string; onClose: () => void; onAdded: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [ticketType, setTicketType] = useState("Regular");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim()) { setError("Please enter a name."); return; }
    setSaving(true);
    setError("");
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const res = await fetch(`/api/events/${eventId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guests: [{ name, email: email.trim() || undefined }] }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add guest.");
      setSaving(false);
      return;
    }
    // Update ticket type if not Regular
    if (ticketType !== "Regular") {
      const created = await res.json().catch(() => null);
      if (created) {
        // We'll handle this after the invite is created; for now just refresh
      }
    }
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add Guest</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="guest@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ticket Type</label>
            <select
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {TICKET_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Adding..." : "Add Guest"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Placeholder modal
function AddPlaceholderModal({ eventId, onClose, onAdded }: { eventId: string; onClose: () => void; onAdded: () => void }) {
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (count < 1) { setError("Count must be at least 1."); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/events/${eventId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeholderCount: count, notes: notes.trim() || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add placeholders.");
      setSaving(false);
      return;
    }
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add Placeholder Seats</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">How many placeholder seats?</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Who are these for? (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Acme Corp sponsorship"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50">
              {saving ? "Adding..." : `Add ${count} Placeholder${count !== 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InviteManager({ eventId, invites, trackMeals, trackSeating, onRefresh, ccConnected, syncing, syncResult, onSyncCC, tableNames = {} }: InviteManagerProps) {
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showAddPlaceholder, setShowAddPlaceholder] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const distinctGroups = useMemo(() =>
    Array.from(new Set(invites.map((i) => i.group).filter(Boolean))).sort(),
    [invites]
  );

  // Alert banner counts
  const placeholderCount = invites.filter((i) => i.isPlaceholder).length;
  const unfulfilledSeatingRequests = invites.filter(
    (i) => i.seatingRequest && i.seatingRequest.trim() !== "" && !i.tableId
  ).length;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const filtered = invites
    .filter((inv) => {
      const matchesFilter = filter === "ALL" || inv.rsvpStatus === filter;
      const name = getDisplayName(inv).toLowerCase();
      const group = (inv.group || "").toLowerCase();
      const term = search.toLowerCase();
      const matchesSearch = name.includes(term) || group.includes(term);
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = getDisplayName(a).localeCompare(getDisplayName(b));
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
        case "ticket":
          cmp = (a.ticketType || "Regular").localeCompare(b.ticketType || "Regular");
          break;
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

  async function updateAttended(inviteId: string, attended: boolean) {
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attended }),
    });
    onRefresh();
  }

  async function updateTicketType(inviteId: string, ticketType: string) {
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketType }),
    });
    onRefresh();
  }

  async function updateSeatingRequest(inviteId: string, seatingRequest: string) {
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatingRequest }),
    });
    onRefresh();
  }

  async function removeInvite(inviteId: string) {
    if (!confirm("Remove this person from the event?")) return;
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, { method: "DELETE" });
    onRefresh();
  }

  // Column count for empty state colspan
  const colCount = 8 + (trackMeals ? 1 : 0) + (trackSeating ? 1 : 0);

  return (
    <div>
      {/* Alert banners */}
      {placeholderCount > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
          <span>⚠</span>
          <span>{placeholderCount} seat{placeholderCount !== 1 ? "s" : ""} still need names — follow up with sponsors to confirm attendees</span>
        </div>
      )}
      {unfulfilledSeatingRequests > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
          <span>⚠</span>
          <span>{unfulfilledSeatingRequests} seating request{unfulfilledSeatingRequests !== 1 ? "s" : ""} not yet placed</span>
        </div>
      )}

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
              const headers = [
                "Last Name", "First Name", "Type", "RSVP", "Group",
                ...(trackMeals ? ["Meal"] : []),
                "Dietary",
                ...(trackSeating ? ["Table"] : []),
                "Ticket Type",
                "Seat Request",
                "Attended",
              ];
              const rows = filtered.map((inv) => {
                const lastName = inv.isPlaceholder ? "TBD" : inv.isGuest ? "" : (inv.person?.lastName || "");
                const firstName = inv.isPlaceholder ? "" : inv.isGuest ? (inv.guestName || "") : (inv.person?.firstName || "");
                const type = inv.isPlaceholder ? "Placeholder" : inv.isGuest ? "Guest" : "Person";
                return [
                  lastName,
                  firstName,
                  type,
                  inv.rsvpStatus,
                  inv.group || "",
                  ...(trackMeals ? [inv.meal] : []),
                  (inv.dietary || []).join("; "),
                  ...(trackSeating ? [inv.tableId ? (tableNames[inv.tableId] || "Seated") : ""] : []),
                  inv.ticketType || "Regular",
                  inv.seatingRequest || "",
                  inv.attended ? "Yes" : "No",
                ];
              });
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
            onClick={() => setShowAddPlaceholder(true)}
            className="border border-amber-400 text-amber-700 px-3 py-1.5 rounded-md hover:bg-amber-50 text-sm"
          >
            + Placeholder
          </button>
          <button
            onClick={() => setShowAddGuest(true)}
            className="border border-purple-400 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-50 text-sm"
          >
            + Add Guest
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
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Dietary</th>
              {trackSeating && <th className="text-left px-4 py-3 font-semibold text-indigo-900 cursor-pointer hover:text-indigo-700 select-none" onClick={() => handleSort("seated")}>Table{sortIndicator("seated")}</th>}
              <th className="text-left px-4 py-3 font-semibold text-indigo-900 cursor-pointer hover:text-indigo-700 select-none" onClick={() => handleSort("ticket")}>Ticket{sortIndicator("ticket")}</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Seat Request</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Attended</th>
              <th className="text-right px-4 py-3 font-semibold text-indigo-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {inv.isPlaceholder ? (
                    <span className="text-gray-400 italic">TBD <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 not-italic">Placeholder</span></span>
                  ) : inv.isGuest ? (
                    <span>{inv.guestName || "Guest"} <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded px-1">Guest</span></span>
                  ) : (
                    <span>{inv.person ? `${inv.person.lastName}, ${inv.person.firstName}` : "Unknown"}</span>
                  )}
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
                <td className="px-4 py-3">
                  <DietaryCell inv={inv} eventId={eventId} onRefresh={onRefresh} />
                </td>
                {trackSeating && (
                  <td className="px-4 py-3">
                    {inv.tableId ? (
                      <span className="text-green-600 text-xs font-medium">{tableNames[inv.tableId] || "Seated"}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <select
                    value={inv.ticketType || "Regular"}
                    onChange={(e) => updateTicketType(inv.id, e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                  >
                    {TICKET_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <BlurInput
                    type="text"
                    value={inv.seatingRequest || ""}
                    onCommit={(val) => updateSeatingRequest(inv.id, val)}
                    placeholder="Request..."
                    className="w-full min-w-[8rem] px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => updateAttended(inv.id, !inv.attended)}
                    className={`px-2 py-1 text-xs font-medium rounded border ${
                      inv.attended
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {inv.attended ? "Yes" : "No"}
                  </button>
                </td>
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
                <td colSpan={colCount} className="px-4 py-8 text-center text-gray-400">
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
          existingPeopleIds={invites.filter((i) => i.peopleId).map((i) => i.peopleId!)}
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

      {showAddGuest && (
        <AddGuestModal
          eventId={eventId}
          onClose={() => setShowAddGuest(false)}
          onAdded={onRefresh}
        />
      )}

      {showAddPlaceholder && (
        <AddPlaceholderModal
          eventId={eventId}
          onClose={() => setShowAddPlaceholder(false)}
          onAdded={onRefresh}
        />
      )}
    </div>
  );
}
