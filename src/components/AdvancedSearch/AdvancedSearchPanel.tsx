"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type {
  FilterRow,
  FilterCategory,
  FilterConnector,
  AdvancedSearchPerson,
  RefData,
} from "./types";

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  status: "Status",
  tags: "Tags",
  notes: "Notes",
  events: "Events",
  fundraisers: "Fundraisers",
  giving: "Giving History",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  PROSPECT: "Prospect",
  INACTIVE: "Inactive",
  DECEASED: "Deceased",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PROSPECT: "bg-blue-100 text-blue-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  DECEASED: "bg-slate-100 text-slate-500",
};

const OPERATORS: Record<FilterCategory, { value: string; label: string }[]> = {
  status: [{ value: "is_any_of", label: "is any of" }],
  tags: [
    { value: "has_any_of", label: "has any of" },
    { value: "has_all_of", label: "has all of" },
    { value: "has_none_of", label: "has none of" },
    { value: "has_any_tag", label: "has any tag" },
    { value: "has_no_tags", label: "has no tags" },
  ],
  notes: [
    { value: "contains_text", label: "contains text" },
    { value: "written_by", label: "written by" },
    { value: "written_between", label: "written between" },
    { value: "has_any", label: "has any notes" },
    { value: "has_none", label: "has no notes" },
  ],
  events: [
    { value: "invited_with_rsvp", label: "invited to (with RSVP)" },
    { value: "attended", label: "attended" },
    { value: "invited_in_date_range", label: "invited to event in date range" },
    { value: "never_invited", label: "never invited to any event" },
  ],
  fundraisers: [
    { value: "solicited_for", label: "on ask list for" },
    { value: "any_solicitation", label: "on any ask list" },
    { value: "never_solicited", label: "never on any ask list" },
  ],
  giving: [
    { value: "donated_to", label: "donated to" },
    { value: "single_gift_at_least", label: "single gift of at least" },
    { value: "single_gift_at_most", label: "single gift of at most" },
    { value: "total_giving_at_least", label: "total giving at least" },
    { value: "total_giving_at_most", label: "total giving at most" },
    { value: "donated_between", label: "donated between" },
    { value: "is_recurring", label: "is a recurring donor" },
    { value: "has_donated", label: "has donated" },
    { value: "never_donated", label: "has never donated" },
  ],
};

const NO_VALUE_OPERATORS = new Set([
  "has_any_tag", "has_no_tags", "has_any", "has_none",
  "never_invited", "any_solicitation", "never_solicited",
  "is_recurring", "has_donated", "never_donated",
]);

function defaultOperator(cat: FilterCategory) {
  return OPERATORS[cat][0].value;
}

function defaultValue(cat: FilterCategory, op: string): Record<string, unknown> {
  if (cat === "status") return { statuses: ["ACTIVE"] };
  if (cat === "tags") return { tagIds: [] };
  if (cat === "notes" && op === "contains_text") return { keyword: "" };
  if (cat === "notes" && op === "written_by") return { authorId: "" };
  if (cat === "notes" && op === "written_between") return { dateFrom: "", dateTo: "" };
  if (cat === "events" && (op === "invited_with_rsvp" || op === "attended")) return { eventId: "", rsvpStatus: "ANY" };
  if (cat === "events" && op === "invited_in_date_range") return { dateFrom: "", dateTo: "" };
  if (cat === "fundraisers" && op === "solicited_for") return { fundraiserId: "", solicitationStatus: "ANY" };
  if (cat === "giving" && op === "donated_to") return { fundraiserId: "" };
  if (cat === "giving" && op === "donated_between") return { dateFrom: "", dateTo: "" };
  if (cat === "giving" && (op.includes("gift") || op.includes("giving"))) return { amount: "" };
  return {};
}

function makeRow(cat: FilterCategory = "status"): FilterRow {
  const op = defaultOperator(cat);
  return {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category: cat,
    operator: op,
    value: defaultValue(cat, op),
    connector: "AND",
  };
}

function buildOrGroups(filters: FilterRow[]): FilterRow[][] {
  if (!filters.length) return [];
  const groups: FilterRow[][] = [];
  let current: FilterRow[] = [];
  for (let i = 0; i < filters.length; i++) {
    current.push(filters[i]);
    if (i < filters.length - 1 && filters[i].connector === "OR") {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

// ── Props ──────────────────────────────────────────────────────────────────

type Props =
  | { mode: "page"; onClose: () => void }
  | {
      mode: "modal";
      existingPeopleIds: string[];
      onAdd: (ids: string[]) => Promise<void>;
      onBack: () => void;
    };

// ── Component ──────────────────────────────────────────────────────────────

const SS_FILTERS = "adv-search-filters";
const SS_RESULTS = "adv-search-results";

export default function AdvancedSearchPanel(props: Props) {
  const isPage = props.mode === "page";

  const [refData, setRefData] = useState<RefData>({
    tags: [], events: [], fundraisers: [], users: [],
  });
  const [refLoading, setRefLoading] = useState(true);
  const [filters, setFilters] = useState<FilterRow[]>([makeRow("status")]);
  const [results, setResults] = useState<AdvancedSearchPerson[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Tracks whether we've restored from sessionStorage (prevents premature overwrites)
  const [hydrated, setHydrated] = useState(false);

  // Page mode — selection + bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEventId, setBulkEventId] = useState("");
  const [bulkFundraiserId, setBulkFundraiserId] = useState("");
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal mode — selection + adding
  const [modalSelected, setModalSelected] = useState<Set<string>>(new Set());
  const [modalAdding, setModalAdding] = useState(false);

  // Restore last search from sessionStorage on mount (page mode only)
  useEffect(() => {
    if (isPage) {
      try {
        const sf = sessionStorage.getItem(SS_FILTERS);
        if (sf) setFilters(JSON.parse(sf));
        const sr = sessionStorage.getItem(SS_RESULTS);
        if (sr) setResults(JSON.parse(sr));
      } catch { /* sessionStorage unavailable */ }
    }
    setHydrated(true);
  }, []); // intentionally empty — runs once on mount to restore session state

  // Persist filters to sessionStorage whenever they change (after hydration)
  useEffect(() => {
    if (!isPage || !hydrated) return;
    try { sessionStorage.setItem(SS_FILTERS, JSON.stringify(filters)); } catch { /* sessionStorage unavailable */ }
  }, [filters, isPage, hydrated]);

  // Persist results to sessionStorage whenever they change (after hydration)
  useEffect(() => {
    if (!isPage || !hydrated || results === null) return;
    try { sessionStorage.setItem(SS_RESULTS, JSON.stringify(results)); } catch { /* sessionStorage unavailable */ }
  }, [results, isPage, hydrated]);

  useEffect(() => {
    Promise.all([
      fetch("/api/tags").then((r) => r.json()).catch(() => []),
      fetch("/api/events").then((r) => r.json()).catch(() => []),
      fetch("/api/fundraisers").then((r) => r.json()).catch(() => []),
      fetch("/api/users/assignable").then((r) => r.json()).catch(() => []),
    ]).then(([tags, events, fundraisers, users]) => {
      setRefData({
        tags: Array.isArray(tags) ? tags : [],
        events: Array.isArray(events) ? events : [],
        fundraisers: Array.isArray(fundraisers) ? fundraisers : [],
        users: Array.isArray(users) ? users : [],
      });
      setRefLoading(false);
    });
  }, []);

  const orGroups = buildOrGroups(filters);
  const orConnectorCount = filters.slice(0, -1).filter((f) => f.connector === "OR").length;
  const showOrWarning = orConnectorCount >= 2;

  // Only non-event-linked fundraisers for bulk "Add to Ask List"
  const standaloneFundraisers = refData.fundraisers.filter((f) => !f.event);

  // ── Filter state mutations ────────────────────────────────────────────────

  function addFilter() {
    setFilters((prev) => [...prev, makeRow()]);
  }

  function removeFilter(id: string) {
    setFilters((prev) => {
      const next = prev.filter((f) => f.id !== id);
      return next.length ? next : [makeRow()];
    });
    setResults(null);
  }

  function changeCategory(id: string, cat: FilterCategory) {
    const op = defaultOperator(cat);
    setFilters((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, category: cat, operator: op, value: defaultValue(cat, op) } : f
      )
    );
    setResults(null);
  }

  function changeOperator(id: string, op: string, cat: FilterCategory) {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, operator: op, value: defaultValue(cat, op) } : f))
    );
    setResults(null);
  }

  function setConnector(id: string, conn: FilterConnector) {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, connector: conn } : f)));
  }

  function updateValue(id: string, patch: Record<string, unknown>) {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value: { ...f.value, ...patch } } : f))
    );
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async function handleSearch() {
    setSearching(true);
    setSearchError(null);
    setSelected(new Set());
    setModalSelected(new Set());
    setBulkMessage(null);
    try {
      const res = await fetch("/api/people/advanced-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      if (!res.ok) throw new Error();
      setResults(await res.json());
    } catch {
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  function clearAll() {
    setFilters([makeRow("status")]);
    setResults(null);
    setSelected(new Set());
    setModalSelected(new Set());
    setBulkMessage(null);
    setSearchError(null);
    if (isPage) {
      try {
        sessionStorage.removeItem(SS_FILTERS);
        sessionStorage.removeItem(SS_RESULTS);
      } catch { /* sessionStorage unavailable */ }
    }
  }

  // ── Bulk actions (page mode) ──────────────────────────────────────────────

  function exportCsv(emailsOnly: boolean) {
    const rows = displayResults.filter((p) => selected.size === 0 || selected.has(p.id));
    const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const header = emailsOnly
      ? "Last Name,First Name,Email 1,Email 2"
      : "Last Name,First Name,Status,City,State,Phone,Email 1,Email 2";
    const lines = rows.map((p) =>
      emailsOnly
        ? [esc(p.lastName), esc(p.firstName), esc(p.email1), esc(p.email2)].join(",")
        : [esc(p.lastName), esc(p.firstName), esc(STATUS_LABELS[p.status] ?? p.status), esc(p.city), esc(p.state), esc(p.phoneNumber), esc(p.email1), esc(p.email2)].join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = emailsOnly ? "email-list.csv" : "people-search.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function bulkAddToEvent() {
    if (!bulkEventId || selected.size === 0) return;
    setBulkAdding(true);
    setBulkMessage(null);
    try {
      const res = await fetch(`/api/events/${bulkEventId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peopleIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error();
      setBulkMessage({ type: "success", text: `Added ${selected.size} ${selected.size === 1 ? "person" : "people"} to event.` });
      setBulkEventId("");
    } catch {
      setBulkMessage({ type: "error", text: "Failed to add to event." });
    } finally {
      setBulkAdding(false);
    }
  }

  async function bulkAddToFundraiser() {
    if (!bulkFundraiserId || selected.size === 0) return;
    setBulkAdding(true);
    setBulkMessage(null);
    try {
      const res = await fetch(`/api/fundraisers/${bulkFundraiserId}/solicitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peopleIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error();
      setBulkMessage({ type: "success", text: `Added ${selected.size} ${selected.size === 1 ? "person" : "people"} to ask list.` });
      setBulkFundraiserId("");
    } catch {
      setBulkMessage({ type: "error", text: "Failed to add to ask list." });
    } finally {
      setBulkAdding(false);
    }
  }

  // ── Derived results ───────────────────────────────────────────────────────

  const displayResults =
    props.mode === "modal"
      ? (results ?? []).filter((p) => !props.existingPeopleIds.includes(p.id))
      : (results ?? []);

  // ── Value input renderer ──────────────────────────────────────────────────

  function renderValueInput(filter: FilterRow) {
    const { category, operator, value } = filter;
    const upd = (patch: Record<string, unknown>) => updateValue(filter.id, patch);

    if (NO_VALUE_OPERATORS.has(operator)) return null;

    // Status
    if (category === "status") {
      return (
        <div className="flex flex-wrap gap-3 pt-1">
          {(["ACTIVE", "PROSPECT", "INACTIVE", "DECEASED"] as const).map((s) => (
            <label key={s} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={((value.statuses as string[]) ?? []).includes(s)}
                onChange={() => {
                  const curr = (value.statuses as string[]) ?? [];
                  upd({ statuses: curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s] });
                }}
                className="rounded text-indigo-600"
              />
              <span className="text-sm text-gray-700">{STATUS_LABELS[s]}</span>
            </label>
          ))}
        </div>
      );
    }

    // Tags — multi-select pills
    if (category === "tags") {
      if (refLoading) return <span className="text-sm text-gray-400">Loading…</span>;
      if (!refData.tags.length) return <span className="text-sm text-gray-400">No tags defined.</span>;
      const tagIds = (value.tagIds as string[]) ?? [];
      return (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {refData.tags.map((tag) => {
            const sel = tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  upd({ tagIds: sel ? tagIds.filter((x) => x !== tag.id) : [...tagIds, tag.id] })
                }
                className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                  sel
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      );
    }

    // Notes — text keyword
    if (category === "notes" && operator === "contains_text") {
      return (
        <input
          type="text"
          placeholder="Keyword…"
          value={(value.keyword as string) ?? ""}
          onChange={(e) => upd({ keyword: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 w-56"
        />
      );
    }

    // Notes — written by user
    if (category === "notes" && operator === "written_by") {
      return (
        <select
          value={(value.authorId as string) ?? ""}
          onChange={(e) => upd({ authorId: e.target.value })}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Select user —</option>
          {refData.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
      );
    }

    // Date range inputs (notes/events/giving)
    if (
      (category === "notes" && operator === "written_between") ||
      (category === "events" && operator === "invited_in_date_range") ||
      (category === "giving" && operator === "donated_between")
    ) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={(value.dateFrom as string) ?? ""}
            onChange={(e) => upd({ dateFrom: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={(value.dateTo as string) ?? ""}
            onChange={(e) => upd({ dateTo: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          />
        </div>
      );
    }

    // Events — specific event + optional RSVP filter
    if (category === "events" && (operator === "invited_with_rsvp" || operator === "attended")) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={(value.eventId as string) ?? ""}
            onChange={(e) => upd({ eventId: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Select event —</option>
            {refData.events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
                {e.eventDate
                  ? ` (${new Date(e.eventDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })})`
                  : ""}
              </option>
            ))}
          </select>
          {operator === "invited_with_rsvp" && (
            <select
              value={(value.rsvpStatus as string) ?? "ANY"}
              onChange={(e) => upd({ rsvpStatus: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="ANY">Any RSVP</option>
              <option value="PENDING">Pending</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
              <option value="MAYBE">Maybe</option>
            </select>
          )}
        </div>
      );
    }

    // Fundraisers — specific fundraiser + optional solicitation status
    if (category === "fundraisers" && operator === "solicited_for") {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={(value.fundraiserId as string) ?? ""}
            onChange={(e) => upd({ fundraiserId: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Select fundraiser —</option>
            {refData.fundraisers.map((f) => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
          <select
            value={(value.solicitationStatus as string) ?? "ANY"}
            onChange={(e) => upd({ solicitationStatus: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="ANY">Any Status</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="DONATED">Donated</option>
            <option value="DECLINED">Declined</option>
          </select>
        </div>
      );
    }

    // Giving — donated to specific fundraiser
    if (category === "giving" && operator === "donated_to") {
      return (
        <select
          value={(value.fundraiserId as string) ?? ""}
          onChange={(e) => upd({ fundraiserId: e.target.value })}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Select fundraiser —</option>
          {refData.fundraisers.map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>
      );
    }

    // Giving — dollar amount threshold
    if (
      category === "giving" &&
      ["single_gift_at_least", "single_gift_at_most", "total_giving_at_least", "total_giving_at_most"].includes(operator)
    ) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-sm font-medium">$</span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={(value.amount as string | number) ?? ""}
            onChange={(e) => upd({ amount: parseFloat(e.target.value) || 0 })}
            className="w-28 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      );
    }

    return null;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const filterBuilder = (
    <div className={isPage ? "" : "p-4 border-b overflow-y-auto max-h-72"}>
      <div className="space-y-1">
        {filters.map((filter, idx) => (
          <div key={filter.id}>
            {/* AND / OR connector between rows */}
            {idx > 0 && (
              <div className="flex items-center gap-1 my-2 ml-2">
                {(["AND", "OR"] as FilterConnector[]).map((conn) => (
                  <button
                    key={conn}
                    onClick={() => setConnector(filters[idx - 1].id, conn)}
                    className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors ${
                      filters[idx - 1].connector === conn
                        ? conn === "AND"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {conn}
                  </button>
                ))}
              </div>
            )}

            {/* Filter row */}
            <div className="flex items-start gap-2 flex-wrap bg-gray-50 rounded-md p-3 border border-gray-200">
              {/* Category */}
              <select
                value={filter.category}
                onChange={(e) => changeCategory(filter.id, e.target.value as FilterCategory)}
                className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={filter.operator}
                onChange={(e) => changeOperator(filter.id, e.target.value, filter.category)}
                className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {OPERATORS[filter.category].map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {/* Value input */}
              <div className="flex-1 min-w-0">{renderValueInput(filter)}</div>

              {/* Remove */}
              {filters.length > 1 && (
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                  title="Remove filter"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addFilter}
        className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
      >
        <span className="text-base leading-none">+</span> Add Filter
      </button>

      {/* OR warning — appears when 2+ OR connectors exist */}
      {showOrWarning && (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800">
          <p className="font-semibold mb-1">AND is applied before OR.</p>
          <p className="mb-2">Your search finds people matching any of these groups:</p>
          {orGroups.map((group, i) => (
            <div key={i} className="flex items-baseline gap-1.5 mb-0.5 ml-2">
              {i > 0 && <span className="text-amber-600 font-bold text-xs">OR</span>}
              <span className="font-medium">
                ({group.map((f) => CATEGORY_LABELS[f.category]).join(" AND ")})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Search / Clear buttons */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          {searching ? "Searching…" : "Search"}
        </button>
        <button
          onClick={clearAll}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          Clear All
        </button>
      </div>

      {searchError && (
        <p className="mt-3 text-sm text-red-600">{searchError}</p>
      )}
    </div>
  );

  // ── Page mode ─────────────────────────────────────────────────────────────

  if (isPage) {
    const allSelected = displayResults.length > 0 && displayResults.every((p) => selected.has(p.id));
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-indigo-900">Advanced Search</h2>
          <button
            onClick={props.onClose}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to list
          </button>
        </div>

        {filterBuilder}

        {results !== null && (
          <div className="mt-6">
            {/* Results header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                {displayResults.length} {displayResults.length === 1 ? "person" : "people"} found
              </span>
              {displayResults.length > 0 && (
                <button
                  onClick={() => setSelected(allSelected ? new Set() : new Set(displayResults.map((p) => p.id)))}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {/* Bulk actions */}
            {selected.size > 0 && (
              <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md flex items-center gap-4 flex-wrap text-sm">
                <span className="font-semibold text-indigo-800">{selected.size} selected</span>
                <button onClick={() => exportCsv(false)} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  Export CSV
                </button>
                <button onClick={() => exportCsv(true)} className="text-indigo-600 hover:text-indigo-800 font-medium">
                  Export Emails
                </button>
                <div className="flex items-center gap-1.5">
                  <select
                    value={bulkEventId}
                    onChange={(e) => setBulkEventId(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                  >
                    <option value="">Add to event…</option>
                    {refData.events.map((e) => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                  {bulkEventId && (
                    <button
                      onClick={bulkAddToEvent}
                      disabled={bulkAdding}
                      className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {bulkAdding ? "…" : "Go"}
                    </button>
                  )}
                </div>
                {standaloneFundraisers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={bulkFundraiserId}
                      onChange={(e) => setBulkFundraiserId(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                    >
                      <option value="">Add to ask list…</option>
                      {standaloneFundraisers.map((f) => (
                        <option key={f.id} value={f.id}>{f.title}</option>
                      ))}
                    </select>
                    {bulkFundraiserId && (
                      <button
                        onClick={bulkAddToFundraiser}
                        disabled={bulkAdding}
                        className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {bulkAdding ? "…" : "Go"}
                      </button>
                    )}
                  </div>
                )}
                {bulkMessage && (
                  <span className={`text-xs font-medium ${bulkMessage.type === "success" ? "text-green-700" : "text-red-600"}`}>
                    {bulkMessage.text}
                  </span>
                )}
              </div>
            )}

            {/* Results table */}
            <div className="rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-10 px-3 py-2.5"></th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-600">Name</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-600">Status</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-600">City / State</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-600">Email</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-600">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayResults.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                              return next;
                            })
                          }
                          className="rounded text-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        <Link href={`/people/${p.id}`} className="text-indigo-600 hover:underline">
                          {p.lastName}, {p.firstName}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">
                        {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{p.email1 || p.email2 || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {p.tags.slice(0, 3).map((t) => (
                            <span key={t.tag.id} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                              {t.tag.name}
                            </span>
                          ))}
                          {p.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{p.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayResults.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No people match these filters.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Modal mode ────────────────────────────────────────────────────────────

  const allModalSelected =
    displayResults.length > 0 && displayResults.every((p) => modalSelected.has(p.id));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {filterBuilder}

      {results !== null && (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
            <span className="text-xs text-gray-500">
              {displayResults.length} {displayResults.length === 1 ? "person" : "people"} found
            </span>
            {displayResults.length > 0 && (
              <button
                onClick={() =>
                  setModalSelected(
                    allModalSelected ? new Set() : new Set(displayResults.map((p) => p.id))
                  )
                }
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {allModalSelected ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {displayResults.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={modalSelected.has(p.id)}
                  onChange={() =>
                    setModalSelected((prev) => {
                      const next = new Set(prev);
                      next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                      return next;
                    })
                  }
                  className="rounded text-indigo-600"
                />
                <span className="text-sm text-gray-900">
                  {p.lastName}, {p.firstName}
                </span>
                <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </label>
            ))}
            {displayResults.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">No matching people found.</p>
            )}
          </div>
        </>
      )}

      <div className="p-4 border-t flex gap-3 flex-shrink-0">
        <button
          onClick={props.onBack}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
        >
          ← Simple Search
        </button>
        <button
          onClick={async () => {
            if (modalSelected.size === 0) return;
            setModalAdding(true);
            await props.onAdd(Array.from(modalSelected));
            setModalAdding(false);
          }}
          disabled={modalSelected.size === 0 || modalAdding || results === null}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
        >
          {modalAdding
            ? "Adding…"
            : results === null
            ? "Search first"
            : `Add ${modalSelected.size} ${modalSelected.size === 1 ? "Person" : "People"}`}
        </button>
      </div>
    </div>
  );
}
