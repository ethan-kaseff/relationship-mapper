"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import InviteManager from "@/components/events/InviteManager";
import SeatingChartWrapper from "@/components/events/SeatingChartWrapper";
import EventFundraiserSection from "@/components/events/EventFundraiserSection";
import NoticeManager from "@/components/events/NoticeManager";

interface EventInvite {
  id: string;
  peopleId: string | null;
  rsvpStatus: string;
  rsvpDate: string | null;
  meal: string;
  dietary: string[];
  notes: string | null;
  group: string;
  tableId: string | null;
  seatIndex: number | null;
  attended: boolean;
  isGuest: boolean;
  isPlaceholder: boolean;
  guestName: string | null;
  guestEmail: string | null;
  ticketType: string;
  seatingRequest: string | null;
  tableRequest: string | null;
  sponsoredSeats: number | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email1: string | null;
    email2: string | null;
    status: string;
    city: string | null;
    state: string | null;
    phoneNumber: string | null;
    zip: string | null;
    communicationMethod: { name: string } | null;
    assignedTo: { id: string; firstName: string; lastName: string } | null;
    tags: { tag: { id: string; name: string } }[];
    partnerRoles: {
      partner: {
        organizationType: {
          typeName: string;
          officeColors: { officeId: string; color: string }[];
        } | null;
      };
    }[];
  } | null;
}

interface EventData {
  id: string;
  title: string;
  officeId: string;
  description: string | null;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  trackSeating: boolean;
  trackMeals: boolean;
  ticketPrice: number | null;
  mealCost: number | null;
  seatingLayout: unknown;
  invites: EventInvite[];
  fundraisers: {
    id: string;
    title: string;
    goalAmount: number;
    currentAmount: number;
    donations: { id: string; peopleId: string | null; approvalStatus: string; qbSyncStatus: string; isRecurring: boolean; amount: number; paymentMethod: string; sponsoredSeats: number | null; seatsUsed: number | null; seatsChangeNote: string | null; sponsorshipLevel: { name: string } | null }[];
  }[];
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "SYSTEM_ADMIN" || session?.user?.role === "OFFICE_ADMIN";
  const initialTab = searchParams.get("tab") as "details" | "invites" | "notices" | "seating" | "settings" | null;
  const [activeTab, setActiveTab] = useState<"details" | "invites" | "notices" | "seating" | "settings">(initialTab || "details");
  // Track whether the seating chart has been opened at least once so we can keep it mounted
  const [seatingEverOpened, setSeatingEverOpened] = useState(initialTab === "seating");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", eventDate: "", eventTime: "", location: "", trackSeating: true, trackMeals: true, ticketPriceDollars: "", mealCostDollars: "" });
  const [saving, setSaving] = useState(false);
  const [ccConnected, setCcConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatuses, setExportStatuses] = useState({ YES: true, NO: false, MAYBE: false, PENDING: false });
  const [customNoticeRows, setCustomNoticeRows] = useState<string[][]>([]);

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/events/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
      setForm({
        title: data.title || "",
        description: data.description || "",
        eventDate: data.eventDate ? data.eventDate.split("T")[0] : "",
        eventTime: data.eventTime || "",
        location: data.location || "",
        trackSeating: data.trackSeating ?? true,
        trackMeals: data.trackMeals ?? true,
        ticketPriceDollars: data.ticketPrice ? (data.ticketPrice / 100).toFixed(2) : "",
        mealCostDollars: data.mealCost ? (data.mealCost / 100).toFixed(2) : "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    fetch("/api/constant-contact/status")
      .then((res) => res.json())
      .then((data) => setCcConnected(data.connected))
      .catch(() => {});
  }, []);

  async function handleSyncCC() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/events/${id}/sync-cc`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data.message);
      } else {
        setSyncResult(data.error || "Sync failed");
      }
    } catch {
      setSyncResult("Failed to sync to Constant Contact");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 8000);
    }
  }

  const editTaxDeductible = useMemo(() => {
    const ticket = parseFloat(form.ticketPriceDollars);
    const meal = parseFloat(form.mealCostDollars);
    if (isNaN(ticket) || ticket <= 0) return null;
    return Math.max(0, ticket - (isNaN(meal) ? 0 : meal));
  }, [form.ticketPriceDollars, form.mealCostDollars]);

  async function handleSave() {
    setSaving(true);
    const { ticketPriceDollars, mealCostDollars, ...rest } = form;
    const res = await fetch(`/api/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...rest,
        eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
        ticketPrice: ticketPriceDollars ? Math.round(parseFloat(ticketPriceDollars) * 100) : null,
        mealCost: mealCostDollars ? Math.round(parseFloat(mealCostDollars) * 100) : null,
      }),
    });
    if (res.ok) {
      await fetchEvent();
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!event) return;
    const syncedDonations = event.fundraisers.some((f) =>
      f.donations.some((d) => d.qbSyncStatus !== "NOT_SYNCED")
    );
    if (syncedDonations) {
      alert("This event has donations that have been synced to QuickBooks and cannot be deleted.");
      return;
    }

    if (!confirm("Delete this event and all its invites? This cannot be undone.")) return;

    let alsoDeleteFundraiser = false;
    if (event.fundraisers.length > 0) {
      const names = event.fundraisers.map((f) => `"${f.title}"`).join(", ");
      alsoDeleteFundraiser = confirm(
        `This event is linked to fundraiser ${names}. Delete the fundraiser and all its donations too?`
      );
    }

    if (alsoDeleteFundraiser) {
      for (const f of event.fundraisers) {
        await fetch(`/api/fundraisers/${f.id}`, { method: "DELETE" });
      }
    }

    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/events");
  }

  const NOTICE_XLSX_HEADERS = ["Name", "Email", "Group", "RSVP Status", "Ticket Type", "Table", "Meal", "Org Type"];

  async function downloadAllNoticesXlsx() {
    const res = await fetch("/api/export/xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: `${event?.title.replace(/[^a-z0-9]/gi, "-") ?? "event"}-notices.xlsx`,
        sheets: [
          { name: "System Notices", headers: ["Notice", ...NOTICE_XLSX_HEADERS], rows: systemNoticeRows },
          { name: "Custom Notices", headers: ["Notice", ...NOTICE_XLSX_HEADERS], rows: customNoticeRows },
        ],
      }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${event?.title.replace(/[^a-z0-9]/gi, "-") ?? "event"}-notices.xlsx`;
    a.click();
  }

  function exportEmailsCSV() {
    if (!event) return;
    const selected = Object.entries(exportStatuses).filter(([, v]) => v).map(([k]) => k);
    const rows = [["First Name", "Last Name", "Email"]];
    for (const invite of event.invites) {
      if (!selected.includes(invite.rsvpStatus)) continue;
      if (!invite.person) continue;
      const email = invite.person.email1 || invite.person.email2;
      if (!email) continue;
      rows.push([invite.person.firstName, invite.person.lastName, email]);
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const statusSuffix = selected.join("-");
    a.download = `${event.title.replace(/[^a-z0-9]/gi, "-")}-emails-${statusSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Loading...</div>;
  if (!event) return <div className="text-red-500 py-8 text-center">Event not found.</div>;

  const rsvpCounts = {
    YES: event.invites.filter((i) => i.rsvpStatus === "YES").length,
    NO: event.invites.filter((i) => i.rsvpStatus === "NO").length,
    MAYBE: event.invites.filter((i) => i.rsvpStatus === "MAYBE").length,
    PENDING: event.invites.filter((i) => i.rsvpStatus === "PENDING").length,
  };

  const placeholders = event.invites.filter((i) => i.isPlaceholder);
  const placeholderCount = placeholders.length;
  const unfulfilledSeatingRequests = event.invites.filter(
    (i) => i.seatingRequest && i.seatingRequest.trim() !== "" && !i.tableId
  );
  const paidPeopleIds = new Set(
    event.fundraisers.flatMap((f) => f.donations.map((d) => d.peopleId)).filter(Boolean)
  );
  const unpaidRegular = event.invites.filter(
    (i) => i.rsvpStatus === "YES" && i.ticketType === "Regular" && !i.isPlaceholder && i.peopleId && !paidPeopleIds.has(i.peopleId)
  );
  const unfulfilledTableRequests = event.invites.filter((i) => {
    if (!i.tableRequest || !i.tableId) return false;
    return !event.invites.some(
      (other) => other.id !== i.id && other.tableId === i.tableId && other.group === i.tableRequest
    );
  });
  const seatDiscrepancies = event.fundraisers.flatMap((f) =>
    f.donations.filter((d) => d.sponsoredSeats != null && d.seatsUsed != null && d.seatsUsed < d.sponsoredSeats && d.peopleId)
      .map((d) => {
        const invite = event.invites.find((i) => i.peopleId === d.peopleId);
        const name = invite?.person ? `${invite.person.firstName} ${invite.person.lastName}` : d.peopleId ?? "Unknown";
        return { name, allowed: d.sponsoredSeats!, used: d.seatsUsed!, note: d.seatsChangeNote };
      })
  );
  const totalNoticeCount = placeholderCount + unfulfilledSeatingRequests.length + unpaidRegular.length + unfulfilledTableRequests.length + seatDiscrepancies.length;

  const tableNameMap: Record<string, string> = (() => {
    const layout = event.seatingLayout as { tables?: { id: string; name: string }[] } | null;
    if (!layout?.tables) return {};
    return Object.fromEntries(layout.tables.map((t) => [t.id, t.name]));
  })();

  function sysName(i: EventInvite) {
    return i.person ? `${i.person.firstName} ${i.person.lastName}` : i.guestName || "Unknown";
  }
  function sysEmail(i: EventInvite) {
    return i.person?.email1 || i.person?.email2 || i.guestEmail || "";
  }
  function sysOrgType(i: EventInvite) {
    return i.person?.partnerRoles[0]?.partner?.organizationType?.typeName ?? "";
  }

  const systemNoticeRows: string[][] = [
    ...placeholders.map((i) => [
      "Seats need names",
      sysName(i), sysEmail(i), i.group, i.rsvpStatus, i.ticketType,
      i.tableId ? (tableNameMap[i.tableId] ?? "") : "",
      i.meal, sysOrgType(i),
    ]),
    ...unfulfilledSeatingRequests.map((i) => [
      "Special seating request not placed",
      sysName(i), sysEmail(i), i.group, i.rsvpStatus, i.ticketType,
      i.tableId ? (tableNameMap[i.tableId] ?? "") : "",
      i.meal, sysOrgType(i),
    ]),
    ...unpaidRegular.map((i) => [
      "RSVP'd Yes but not paid",
      sysName(i), sysEmail(i), i.group, i.rsvpStatus, i.ticketType,
      i.tableId ? (tableNameMap[i.tableId] ?? "") : "",
      i.meal, sysOrgType(i),
    ]),
    ...unfulfilledTableRequests.map((i) => [
      "Not seated with requested group",
      sysName(i), sysEmail(i), i.group, i.rsvpStatus, i.ticketType,
      i.tableId ? (tableNameMap[i.tableId] ?? "") : "",
      i.meal, sysOrgType(i),
    ]),
    ...seatDiscrepancies.map((d) => {
      const inv = event.invites.find((i) => i.person && `${i.person.firstName} ${i.person.lastName}` === d.name);
      const email = inv?.person?.email1 || inv?.person?.email2 || "";
      return ["Sponsor using fewer seats than purchased", d.name, email, "", "", "", "", "", ""];
    }),
  ];

  const tabs: { id: "details" | "invites" | "notices" | "seating" | "settings"; label: string; count?: number }[] = [
    { id: "details", label: "Details" },
    { id: "invites", label: "Invites", count: event.invites.length },
    { id: "notices", label: "Notices", count: totalNoticeCount },
  ];
  if (event.trackSeating) {
    tabs.push({ id: "seating", label: "Seating Chart", count: rsvpCounts.YES });
  }
  if (isAdmin) {
    tabs.push({ id: "settings", label: "Settings" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print-hide">
        <div>
          <Link href="/events" className="text-indigo-600 hover:underline text-sm">
            &larr; Back to Events
          </Link>
          <h1 className="text-2xl font-bold text-indigo-900 mt-1">{event.title}</h1>
          {event.fundraisers.length > 0 && (
            <div className="text-sm">
              <span className="text-gray-500">Fundraiser:</span>{" "}
              {event.fundraisers.map((f, i) => (
                <span key={f.id}>
                  {i > 0 && <span className="text-gray-400">, </span>}
                  <Link href={`/fundraisers/${f.id}`} className="text-indigo-600 hover:underline">
                    ↗ {f.title}
                  </Link>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {activeTab === "invites" && (
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-md hover:bg-indigo-50"
            >
              Export Emails (CSV)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 print-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id === "seating") setSeatingEverOpened(true); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={form.eventTime}
                    onChange={(e) => setForm((f) => ({ ...f, eventTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.ticketPriceDollars}
                    onChange={(e) => setForm((f) => ({ ...f, ticketPriceDollars: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meal Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.mealCostDollars}
                    onChange={(e) => setForm((f) => ({ ...f, mealCostDollars: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              {editTaxDeductible !== null && (
                <p className="text-sm text-gray-600">
                  Tax-deductible amount per ticket: <span className="font-medium text-gray-900">${editTaxDeductible.toFixed(2)}</span>
                </p>
              )}
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-3">Tracking Options</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.trackSeating}
                      onChange={(e) => setForm((f) => ({ ...f, trackSeating: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">Assigned seating</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.trackMeals}
                      onChange={(e) => setForm((f) => ({ ...f, trackMeals: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">Meal selection</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
                <button
                  onClick={() => setEditing(true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
              <dl className="space-y-3">
                {event.eventDate && (
                  <div>
                    <dt className="text-sm text-gray-500">Date</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(event.eventDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
                      {event.eventTime && ` at ${event.eventTime}`}
                    </dd>
                  </div>
                )}
                {event.location && (
                  <div>
                    <dt className="text-sm text-gray-500">Location</dt>
                    <dd className="text-sm text-gray-900">{event.location}</dd>
                  </div>
                )}
                {event.description && (
                  <div>
                    <dt className="text-sm text-gray-500">Description</dt>
                    <dd className="text-sm text-gray-900 whitespace-pre-wrap">{event.description}</dd>
                  </div>
                )}
                {!event.eventDate && !event.location && !event.description && (
                  <p className="text-sm text-gray-400">No details added yet. Click Edit to add them.</p>
                )}
              </dl>
            </div>
          )}
        </div>
        <EventFundraiserSection
          eventId={event.id}
          eventTitle={event.title}
          ticketPrice={event.ticketPrice}
          rsvpYesCount={event.invites.filter((i) => i.rsvpStatus === "YES").length}
          fundraiser={event.fundraisers[0] ? {
            id: event.fundraisers[0].id,
            title: event.fundraisers[0].title,
            goalAmount: event.fundraisers[0].goalAmount,
            currentAmount: event.fundraisers[0].currentAmount,
            pendingCount: event.fundraisers[0].donations.filter((d) => d.approvalStatus === "PENDING").length,
          } : null}
          onCreated={fetchEvent}
        />
        </div>
      )}

      {activeTab === "invites" && (
        <InviteManager
          eventId={event.id}
          invites={event.invites}
          trackMeals={event.trackMeals}
          trackSeating={event.trackSeating}
          onRefresh={fetchEvent}
          ccConnected={ccConnected}
          syncing={syncing}
          syncResult={syncResult}
          onSyncCC={handleSyncCC}
          tableNames={tableNameMap}
          seatDiscrepancies={Object.fromEntries(
            event.fundraisers.flatMap((f) =>
              f.donations
                .filter((d) => d.peopleId && d.sponsoredSeats != null && d.sponsoredSeats > 0)
                .map((d) => [d.peopleId!, { allowed: d.sponsoredSeats!, used: d.seatsUsed ?? 0, note: d.seatsChangeNote }])
            )
          )}
        />
      )}

      {activeTab === "notices" && (
        <div className="max-w-2xl space-y-5">
          <div className="flex justify-end">
            <button
              onClick={downloadAllNoticesXlsx}
              className="text-sm border border-indigo-300 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-50"
            >
              Export all notices as Excel
            </button>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">System Notices</h3>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
              {[
                {
                  label: "Seats need names",
                  count: placeholderCount,
                  items: placeholders.map((i) => i.group ? `${i.group} (placeholder)` : "Unnamed placeholder"),
                },
                {
                  label: "Special seating requests not placed",
                  count: unfulfilledSeatingRequests.length,
                  items: unfulfilledSeatingRequests.map((i) => {
                    const name = i.person ? `${i.person.firstName} ${i.person.lastName}` : i.guestName || "Unknown";
                    return `${name} — "${i.seatingRequest}"`;
                  }),
                },
                {
                  label: "RSVP'd Yes but not paid",
                  count: unpaidRegular.length,
                  items: unpaidRegular.map((i) => i.person ? `${i.person.firstName} ${i.person.lastName}` : i.guestName || "Unknown"),
                },
                {
                  label: "Not seated with requested group",
                  count: unfulfilledTableRequests.length,
                  items: unfulfilledTableRequests.map((i) => {
                    const name = i.person ? `${i.person.firstName} ${i.person.lastName}` : i.guestName || "Unknown";
                    return `${name} — requested: ${i.tableRequest}`;
                  }),
                },
                {
                  label: "Sponsors using fewer seats than purchased",
                  count: seatDiscrepancies.length,
                  items: seatDiscrepancies.map((d) => `${d.name} — ${d.used} of ${d.allowed} used${d.note ? `: ${d.note.split("\n")[0]}` : ""}`),
                },
              ].map(({ label, count, items }) => (
                <div key={label} className={`px-4 py-2.5 text-sm ${count > 0 ? "bg-amber-50" : "bg-white"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={count > 0 ? "text-amber-500" : "text-green-500"}>
                        {count > 0 ? "⚠" : "✓"}
                      </span>
                      <span className={count > 0 ? "font-medium text-amber-900" : "text-gray-600"}>{label}</span>
                    </div>
                    <span className={`text-xs shrink-0 ${count > 0 ? "text-amber-700 font-medium" : "text-gray-400"}`}>
                      {count > 0 ? `${count} ${count === 1 ? "issue" : "issues"}` : "none"}
                    </span>
                  </div>
                  {count > 0 && (
                    <ul className="mt-1.5 ml-6 space-y-0.5 text-xs text-amber-800">
                      {items.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Custom Notices</h3>
            <NoticeManager
              eventId={event.id}
              invites={event.invites}
              donations={event.fundraisers.flatMap((f) => f.donations)}
              tableNameMap={tableNameMap}
              isAdmin={isAdmin}
              onEvaluatedRowsChange={setCustomNoticeRows}
            />
          </div>
        </div>
      )}

      {seatingEverOpened && (
        <div style={{ display: activeTab === "seating" ? "block" : "none" }}>
          <SeatingChartWrapper
            event={event}
            onRefresh={fetchEvent}
          />
        </div>
      )}

      {activeTab === "settings" && isAdmin && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-red-800 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-600 mb-3">
              Deleting this event will permanently remove all invites and seating data.
            </p>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
            >
              Delete Event
            </button>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Export Emails</h2>
            <p className="text-sm text-gray-500 mb-4">Select which RSVP statuses to include:</p>
            <div className="space-y-2 mb-6">
              {(["YES", "NO", "MAYBE", "PENDING"] as const).map((status) => {
                const labels = { YES: "Yes", NO: "No", MAYBE: "Maybe", PENDING: "Pending" };
                const count = event.invites.filter(
                  (i) => i.rsvpStatus === status && i.person && (i.person.email1 || i.person.email2)
                ).length;
                return (
                  <label key={status} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportStatuses[status]}
                      onChange={(e) => setExportStatuses((s) => ({ ...s, [status]: e.target.checked }))}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">{labels[status]}</span>
                    <span className="text-xs text-gray-400 ml-auto">{count} with email</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={exportEmailsCSV}
                disabled={!Object.values(exportStatuses).some(Boolean)}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
