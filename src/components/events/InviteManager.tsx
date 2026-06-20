"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import AddPeopleModal from "./AddPeopleModal";
import AddFromPartnerModal from "./AddFromPartnerModal";
import FillPlaceholderModal from "./FillPlaceholderModal";
import Pagination, { usePagination } from "../Pagination";
import { usePersistedState } from "@/hooks/usePersistedState";
import { DIETARY_OPTIONS } from "@/lib/seating-constants";
import InviteOptionsPanel from "./InviteOptionsPanel";

interface DietaryOptionRecord { id: string; name: string; }

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
  tableRequest: string | null;
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
  seatDiscrepancies?: Record<string, { allowed: number; used: number; note: string | null }>;
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
  if (inv.isGuest && inv.guestName) {
    const parts = inv.guestName.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`;
    return inv.guestName;
  }
  if (inv.person) return `${inv.person.lastName}, ${inv.person.firstName}`;
  return "Unknown";
}

// Inline dietary popover
function DietaryCell({ inv, eventId, onRefresh }: { inv: EventInvite; eventId: string; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(inv.dietary || []);
  const [customOptions, setCustomOptions] = useState<DietaryOptionRecord[]>([]);
  const [newOption, setNewOption] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setSelected(inv.dietary || []); }, [inv.dietary]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/lookup/dietary-options")
      .then((r) => r.json())
      .then((d) => setCustomOptions(Array.isArray(d) ? d : []))
      .catch(() => {});
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
    setSelected((prev) => prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt]);
  }

  async function addCustom() {
    const name = newOption.trim();
    if (!name) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/lookup/dietary-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const rec: DietaryOptionRecord = await res.json();
        setCustomOptions((prev) => [...prev.filter((o) => o.id !== rec.id), rec].sort((a, b) => a.name.localeCompare(b.name)));
        setSelected((prev) => prev.includes(name) ? prev : [...prev, name]);
        setNewOption("");
        // Scroll the list to the bottom so the newly added option is visible
        setTimeout(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, 50);
      } else {
        const data = await res.json().catch(() => ({}));
        setAddError((data as { error?: string }).error || "Failed to add option.");
      }
    } catch {
      setAddError("Network error — could not add option.");
    }
    setAdding(false);
  }

  // All options: built-ins first, then custom (deduped)
  const builtInSet = new Set(DIETARY_OPTIONS);
  const allOptions = [
    ...DIETARY_OPTIONS,
    ...customOptions.filter((o) => !builtInSet.has(o.name)).map((o) => o.name),
  ];

  if (inv.dietary.length === 0 && !open) {
    return (
      <span className="text-gray-400 text-xs cursor-pointer hover:text-gray-600" onClick={() => setOpen(true)}>—</span>
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
        <div className="absolute z-50 left-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]">
          <p className="text-xs font-semibold text-gray-700 mb-2">Dietary Restrictions</p>
          <div ref={listRef} className="space-y-1 max-h-48 overflow-y-auto">
            {allOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="rounded text-indigo-600" />
                <span className="text-xs text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex gap-1">
              <input
                type="text"
                value={newOption}
                onChange={(e) => { setNewOption(e.target.value); setAddError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); addCustom(); } }}
                placeholder="Add custom..."
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={(e) => { e.stopPropagation(); addCustom(); }}
                disabled={adding || !newOption.trim()}
                className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40"
              >
                {adding ? "..." : "Add"}
              </button>
            </div>
            {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => { save(selected); setOpen(false); }} className="flex-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
            <button onClick={() => { setSelected(inv.dietary); setOpen(false); }} className="flex-1 px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}
      {!open && inv.dietary.length === 0 && (
        <span className="text-gray-400 text-xs cursor-pointer hover:text-gray-600 ml-1" onClick={() => setOpen(true)}>+ add</span>
      )}
    </div>
  );
}

// Add Guest modal
function AddGuestModal({ eventId, groups, onClose, onAdded }: { eventId: string; groups: string[]; onClose: () => void; onAdded: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState("YES");
  const [meal, setMeal] = useState("Standard");
  const [dietary, setDietary] = useState<string[]>([]);
  const [ticketType, setTicketType] = useState("Regular");
  const [seatingRequest, setSeatingRequest] = useState("");
  const [tableRequest, setTableRequest] = useState("");
  const [customDietary, setCustomDietary] = useState<DietaryOptionRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/lookup/dietary-options").then((r) => r.json()).then((d) => setCustomDietary(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim()) { setError("Please enter a name."); return; }
    setSaving(true);
    setError("");
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const res = await fetch(`/api/events/${eventId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guests: [{ name, email: email.trim() || undefined }],
        rsvpStatus, meal, dietary, ticketType,
        seatingRequest: seatingRequest.trim() || null,
        tableRequest: tableRequest.trim() || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to add guest.");
      setSaving(false);
      return;
    }
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[28rem] max-h-[90vh] overflow-y-auto">
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
          <div className="pt-1 border-t border-gray-100">
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

export default function InviteManager({ eventId, invites, trackMeals, trackSeating, onRefresh, ccConnected, syncing, syncResult, onSyncCC, tableNames = {}, seatDiscrepancies = {} }: InviteManagerProps) {
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showAddPlaceholder, setShowAddPlaceholder] = useState(false);
  const [fillPlaceholderId, setFillPlaceholderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = usePersistedState<SortKey>("invite-sort-key", "name");
  const [sortDir, setSortDir] = usePersistedState<SortDir>("invite-sort-dir", "asc");
  const [tableRequestOverrides, setTableRequestOverrides] = useState<Record<string, string | null>>({});
  const [compPromptInviteId, setCompPromptInviteId] = useState<string | null>(null);

  // Clear optimistic overrides whenever fresh invite data arrives
  useEffect(() => {
    setTableRequestOverrides({});
  }, [invites]);

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

  async function updateRsvp(inviteId: string, rsvpStatus: string, extraFields?: Record<string, unknown>) {
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvpStatus, ...extraFields }),
    });
    onRefresh();
  }

  function handleRsvpChange(inv: EventInvite, newStatus: string) {
    if (newStatus === "YES" && inv.ticketType !== "Comp" && !inv.group) {
      setCompPromptInviteId(inv.id);
    } else {
      updateRsvp(inv.id, newStatus);
    }
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

  async function updateTableRequest(inviteId: string, tableRequest: string) {
    setTableRequestOverrides((prev) => ({ ...prev, [inviteId]: tableRequest || null }));
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableRequest: tableRequest || null }),
    });
    onRefresh();
  }

  async function removeInvite(inviteId: string) {
    if (!confirm("Remove this person from the event?")) return;
    await fetch(`/api/events/${eventId}/invites/${inviteId}`, { method: "DELETE" });
    onRefresh();
  }

  async function promoteGuestToPeople(inviteId: string) {
    if (!confirm("Create a People record from this guest and link them to this event?")) return;
    await fetch(`/api/events/${eventId}/invites/${inviteId}/promote`, { method: "POST" });
    onRefresh();
  }

  // Column count for empty state colspan
  const hasTableGroups = distinctGroups.length > 0;
  const colCount = 8 + (trackMeals ? 1 : 0) + (trackSeating ? 1 : 0) + (hasTableGroups ? 1 : 0);

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
              const headers = [
                "Last Name", "First Name", "Type", "RSVP", "Group",
                ...(trackMeals ? ["Meal"] : []),
                "Dietary",
                ...(trackSeating ? ["Table"] : []),
                "Ticket Type",
                ...(hasTableGroups ? ["Table Request"] : []),
                "Special Request",
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
                  ...(hasTableGroups ? [inv.tableRequest || ""] : []),
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
              {hasTableGroups && <th className="text-left px-4 py-3 font-semibold text-indigo-900">Table Req</th>}
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Special Req</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Attended</th>
              <th className="text-right px-4 py-3 font-semibold text-indigo-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {inv.isPlaceholder ? (
                    <button
                      onClick={() => setFillPlaceholderId(inv.id)}
                      className="text-left text-indigo-600 hover:text-indigo-800 hover:underline italic"
                    >
                      TBD <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 not-italic">Placeholder</span>
                    </button>
                  ) : inv.isGuest ? (
                    <span>{getDisplayName(inv)} <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 rounded px-1">Guest</span></span>
                  ) : (
                    <span>{inv.person ? `${inv.person.lastName}, ${inv.person.firstName}` : "Unknown"}</span>
                  )}
                  {inv.peopleId && seatDiscrepancies[inv.peopleId] && seatDiscrepancies[inv.peopleId].used < seatDiscrepancies[inv.peopleId].allowed && (
                    <span
                      className="ml-1 inline-flex items-center text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded px-1"
                      title={`${seatDiscrepancies[inv.peopleId].used} of ${seatDiscrepancies[inv.peopleId].allowed} seats used${seatDiscrepancies[inv.peopleId].note ? `\n${seatDiscrepancies[inv.peopleId].note}` : ""}`}
                    >
                      {seatDiscrepancies[inv.peopleId].used}/{seatDiscrepancies[inv.peopleId].allowed}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <select
                      value={inv.rsvpStatus}
                      onChange={(e) => handleRsvpChange(inv, e.target.value)}
                      className={`px-2 py-1 text-xs font-medium rounded border ${RSVP_COLORS[inv.rsvpStatus]}`}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                      <option value="MAYBE">Maybe</option>
                    </select>
                    {compPromptInviteId === inv.id && (
                      <span className="text-xs text-gray-700 whitespace-nowrap flex items-center gap-1">
                        Comp ticket?
                        <button
                          onClick={() => { updateRsvp(inv.id, "YES", { ticketType: "Comp" }); setCompPromptInviteId(null); }}
                          className="font-semibold text-indigo-600 hover:text-indigo-800 underline"
                        >Yes</button>
                        <span className="text-gray-400">·</span>
                        <button
                          onClick={() => { updateRsvp(inv.id, "YES"); setCompPromptInviteId(null); }}
                          className="text-gray-500 hover:text-gray-700 underline"
                        >No</button>
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {inv.isPlaceholder ? (
                    // A TBD seat belongs to its sponsor's group — its group is
                    // fixed (the seat top-up manages the count), so it's read-only.
                    <span className="text-xs text-gray-600">{inv.group}</span>
                  ) : (
                    <BlurInput
                      type="text"
                      list="group-suggestions"
                      value={inv.group}
                      onCommit={(val) => updateGroup(inv.id, val)}
                      placeholder="Group"
                      className="w-full min-w-[8rem] px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                    />
                  )}
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
                {hasTableGroups && (
                  <td className="px-4 py-3">
                    <select
                      value={(Object.prototype.hasOwnProperty.call(tableRequestOverrides, inv.id) ? tableRequestOverrides[inv.id] : inv.tableRequest) ?? ""}
                      onChange={(e) => updateTableRequest(inv.id, e.target.value)}
                      className="w-full min-w-[8rem] px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">No preference</option>
                      {distinctGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                )}
                <td className="px-4 py-3">
                  <BlurInput
                    type="text"
                    value={inv.seatingRequest || ""}
                    onCommit={(val) => updateSeatingRequest(inv.id, val)}
                    placeholder="Special request..."
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
                  {inv.group ? (
                    <span className="text-xs text-gray-400" title="Managed through sponsorship — adjust seats used on the donation">Sponsored</span>
                  ) : (
                    <div className="flex items-center justify-end gap-3">
                      {inv.isGuest && (
                        <button
                          onClick={() => promoteGuestToPeople(inv.id)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs"
                        >
                          Add to People
                        </button>
                      )}
                      <button
                        onClick={() => removeInvite(inv.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  )}
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
          groups={distinctGroups}
          onClose={() => setShowAddPeople(false)}
          onAdded={onRefresh}
        />
      )}

      {showAddPartner && (
        <AddFromPartnerModal
          eventId={eventId}
          existingPeopleIds={invites.filter((i) => i.peopleId).map((i) => i.peopleId!)}
          groups={distinctGroups}
          onClose={() => setShowAddPartner(false)}
          onAdded={onRefresh}
        />
      )}

      {showAddGuest && (
        <AddGuestModal
          eventId={eventId}
          groups={distinctGroups}
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

      {fillPlaceholderId && (
        <FillPlaceholderModal
          eventId={eventId}
          inviteId={fillPlaceholderId}
          existingPeopleIds={invites.filter((i) => i.peopleId).map((i) => i.peopleId!)}
          groups={distinctGroups}
          onClose={() => setFillPlaceholderId(null)}
          onFilled={() => { setFillPlaceholderId(null); onRefresh(); }}
        />
      )}
    </div>
  );
}
