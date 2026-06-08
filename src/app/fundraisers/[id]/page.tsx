"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatCurrency, dollarsToCents, centsToDollars } from "@/lib/currency";
import AddSolicitationsModal from "@/components/fundraisers/AddSolicitationsModal";
import FundraiserEventSection from "@/components/fundraisers/FundraiserEventSection";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface PartnerOption { id: string; organizationName: string | null; }

interface SponsorshipLevel {
  id: string;
  name: string;
  amount: number;
  seats: number | null;
  description: string | null;
  displayOrder: number;
}

interface Donation {
  id: string;
  amount: number;
  donorName: string | null;
  donorEmail: string | null;
  peopleId: string | null;
  person: Person | null;
  sponsorshipLevelId: string | null;
  sponsorshipLevel: Pick<SponsorshipLevel, "id" | "name" | "amount" | "seats"> | null;
  partnerId: string | null;
  partner: PartnerOption | null;
  sponsoredSeats: number | null;
  seatsUsed: number | null;
  isAnonymous: boolean;
  paymentMethod: string;
  tributeType: string | null;
  tributeName: string | null;
  taxDeductibleAmount: number | null;
  approvalStatus: string;
  qbSyncStatus: string;
  donatedAt: string;
  isRecurring: boolean;
  notes: string | null;
}

interface Fundraiser {
  id: string;
  title: string;
  description: string | null;
  goalAmount: number;
  currentAmount: number;
  presetAmounts: number[];
  slug: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  event: {
    id: string;
    title: string;
    eventDate: string | null;
    location: string | null;
    trackSeating: boolean;
    ticketPrice: number | null;
    mealCost: number | null;
    inviteCount: number;
    yesCount: number;
  } | null;
  donations: Donation[];
  sponsorshipLevels: SponsorshipLevel[];
}

interface Solicitation {
  id: string;
  status: string;
  person: { id: string; firstName: string; lastName: string; email1: string | null; email2: string | null };
}

type Tab = "overview" | "levels" | "donations" | "solicitations" | "approvals" | "notices" | "settings";

export default function FundraiserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "SYSTEM_ADMIN" || session?.user?.role === "OFFICE_ADMIN";
  const [fundraiser, setFundraiser] = useState<Fundraiser | null>(null);
  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  const [loading, setLoading] = useState(true);
  const initialTab = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(initialTab ?? "overview");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/fundraisers/${id}`);
      if (!res.ok) throw new Error("Not found");
      setFundraiser(await res.json());
    } catch {
      setError("Fundraiser not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadSolicitations = useCallback(async () => {
    const res = await fetch(`/api/fundraisers/${id}/solicitations`);
    if (res.ok) setSolicitations(await res.json());
  }, [id]);

  useEffect(() => { load(); loadSolicitations(); }, [load, loadSolicitations]);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error || !fundraiser) return <div className="text-red-600">{error}</div>;

  const pct = fundraiser.goalAmount > 0
    ? Math.min(100, Math.round((fundraiser.currentAmount / fundraiser.goalAmount) * 100))
    : 0;

  const pendingDonations = fundraiser.donations.filter((d) => d.approvalStatus === "PENDING");
  const sponsorshipsWithOpenSeats = fundraiser.donations.filter(
    (d) => (d.sponsoredSeats ?? 0) > 0 && (d.sponsoredSeats ?? 0) > (d.seatsUsed ?? 0)
  );
  const totalNoticeCount = pendingDonations.length + sponsorshipsWithOpenSeats.length;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "levels", label: "Sponsorship Levels", badge: fundraiser.sponsorshipLevels.length || undefined },
    ...(!fundraiser.event ? [{ key: "solicitations" as Tab, label: "Ask List", badge: solicitations.length || undefined }] : []),
    { key: "donations", label: "Donations" },
    { key: "approvals", label: "Approvals", badge: pendingDonations.length || undefined },
    { key: "notices", label: "Notices", badge: totalNoticeCount || undefined },
    ...(isAdmin ? [{ key: "settings" as Tab, label: "Settings" }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{fundraiser.title}</h1>
          {fundraiser.event && (
            <Link href={`/events/${fundraiser.event.id}`} className="text-sm text-indigo-600 hover:underline">
              ↗ {fundraiser.event.title}
            </Link>
          )}
        </div>
        <Link href="/fundraisers" className="text-indigo-600 hover:underline text-sm">
          Back to Fundraisers
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="ml-1.5 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab fundraiser={fundraiser} pct={pct} onRefresh={load} />}
      {tab === "levels" && <LevelsTab fundraiser={fundraiser} onRefresh={load} />}
      {tab === "donations" && <DonationsTab fundraiser={fundraiser} onRefresh={load} />}
      {tab === "solicitations" && !fundraiser.event && (
        <SolicitationsTab
          fundraiserId={fundraiser.id}
          solicitations={solicitations}
          onRefresh={loadSolicitations}
        />
      )}
      {tab === "approvals" && <ApprovalsTab fundraiser={fundraiser} pending={pendingDonations} onRefresh={load} />}
      {tab === "notices" && <NoticesTab pendingDonations={pendingDonations} sponsorshipsWithOpenSeats={sponsorshipsWithOpenSeats} />}
      {tab === "settings" && isAdmin && <SettingsTab fundraiser={fundraiser} onRefresh={load} onDelete={() => router.push("/fundraisers")} />}
    </div>
  );
}

function OverviewTab({ fundraiser, pct, onRefresh }: { fundraiser: Fundraiser; pct: number; onRefresh: () => void }) {
  const publicUrl = `/donate/${fundraiser.slug}`;
  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-900">
            {formatCurrency(fundraiser.currentAmount)} raised
          </span>
          <span className="text-gray-500">
            {formatCurrency(fundraiser.goalAmount)} goal
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{fundraiser.donations.length} donation{fundraiser.donations.length !== 1 ? "s" : ""}</span>
          <span>{pct}%</span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-lg shadow p-5 space-y-3">
        {fundraiser.description && (
          <p className="text-sm text-gray-700">{fundraiser.description}</p>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status:</span>{" "}
            <span className={fundraiser.isActive ? "text-green-600" : "text-gray-500"}>
              {fundraiser.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {fundraiser.sponsorshipLevels.length > 0 && (
            <div>
              <span className="text-gray-500">Stripe payment Public URL:</span>{" "}
              <Link href={publicUrl} className="text-indigo-600 hover:underline" target="_blank">
                /donate/{fundraiser.slug}
              </Link>
            </div>
          )}
          {fundraiser.startDate && (
            <div>
              <span className="text-gray-500">Start:</span>{" "}
              {new Date(fundraiser.startDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
            </div>
          )}
          {fundraiser.endDate && (
            <div>
              <span className="text-gray-500">End:</span>{" "}
              {new Date(fundraiser.endDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
            </div>
          )}
        </div>
      </div>

      {/* Recent donations */}
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Donations</h3>
        {fundraiser.donations.length === 0 ? (
          <p className="text-sm text-gray-500">No donations yet.</p>
        ) : (
          <div className="space-y-2">
            {fundraiser.donations.slice(0, 5).map((d) => (
              <div key={d.id} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-700">
                  {d.isAnonymous ? "Anonymous" : d.person ? `${d.person.firstName} ${d.person.lastName}` : d.donorName || "Unknown"}
                </span>
                <span className="font-medium text-gray-900">{formatCurrency(d.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <FundraiserEventSection
        fundraiserId={fundraiser.id}
        event={fundraiser.event}
        onCreated={onRefresh}
      />
    </div>
  );
}

function LevelsTab({ fundraiser, onRefresh }: { fundraiser: Fundraiser; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", amountDollars: "", seats: "", description: "" });

  function resetForm() {
    setForm({ name: "", amountDollars: "", seats: "", description: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(level: SponsorshipLevel) {
    setForm({
      name: level.name,
      amountDollars: centsToDollars(level.amount).toString(),
      seats: level.seats != null ? String(level.seats) : "",
      description: level.description ?? "",
    });
    setEditingId(level.id);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const amount = dollarsToCents(parseFloat(form.amountDollars));
      const seats = form.seats !== "" ? parseInt(form.seats) : null;
      const body = { name: form.name, amount, seats, description: form.description || null };
      const url = editingId
        ? `/api/fundraisers/${fundraiser.id}/sponsorship-levels/${editingId}`
        : `/api/fundraisers/${fundraiser.id}/sponsorship-levels`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { resetForm(); onRefresh(); }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(levelId: string) {
    if (!confirm("Delete this sponsorship level?")) return;
    setDeletingId(levelId);
    try {
      await fetch(`/api/fundraisers/${fundraiser.id}/sponsorship-levels/${levelId}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  }

  const levels = fundraiser.sponsorshipLevels;
  const hasEvent = !!fundraiser.event;
  const seatsRequired = !!fundraiser.event?.trackSeating;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-medium text-gray-900">Sponsorship Levels ({levels.length})</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
            >
              Add Level
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSave} className="p-4 border-b bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Level Name</label>
                <input
                  required
                  placeholder="e.g. Platinum, Gold"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 5000"
                  value={form.amountDollars}
                  onChange={(e) => setForm((p) => ({ ...p, amountDollars: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            {hasEvent && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Seats at Event{seatsRequired ? <span className="text-red-500 ml-0.5">*</span> : " (optional)"}
                </label>
                <input
                  type="number"
                  min="0"
                  required={seatsRequired}
                  placeholder="e.g. 10"
                  value={form.seats}
                  onChange={(e) => setForm((p) => ({ ...p, seats: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                placeholder="e.g. Includes VIP reception, logo on materials"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update Level" : "Add Level"}
              </button>
              <button type="button" onClick={resetForm} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        )}

        {levels.length === 0 && !showForm ? (
          <p className="p-4 text-sm text-gray-500">No sponsorship levels defined yet.</p>
        ) : levels.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Level</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Amount</th>
                {hasEvent && <th className="text-left px-4 py-2 font-medium text-gray-500">Seats</th>}
                <th className="text-left px-4 py-2 font-medium text-gray-500">Description</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {levels.map((level) => (
                <tr key={level.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{level.name}</td>
                  <td className="px-4 py-3">{formatCurrency(level.amount)}</td>
                  {hasEvent && (
                    <td className="px-4 py-3">
                      {level.seats != null
                        ? level.seats
                        : seatsRequired
                          ? <span className="text-red-500 text-xs font-medium">Missing</span>
                          : <span className="text-gray-400">—</span>}
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-500 text-xs">{level.description || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => startEdit(level)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                      <button
                        onClick={() => handleDelete(level.id)}
                        disabled={deletingId === level.id}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        {deletingId === level.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}

function DonationsTab({ fundraiser, onRefresh }: { fundraiser: Fundraiser; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personSearch, setPersonSearch] = useState("");
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [manualDonorName, setManualDonorName] = useState(false);
  const [highlightedPersonIndex, setHighlightedPersonIndex] = useState(-1);
  const [form, setForm] = useState({ partnerId: "", donorName: "", donorEmail: "", amountDollars: "", paymentMethod: "cash" as string, notes: "", taxDeductibleDollars: "", sponsorshipLevelId: "", group: "" });
  const [updatingSeatsId, setUpdatingSeatsId] = useState<string | null>(null);
  const [seatsSavedId, setSeatsSavedId] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{ donationId: string; value: string; tableAssignedCount: number } | null>(null);
  const [eventGroups, setEventGroups] = useState<string[]>([]);
  const [seatsValues, setSeatsValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fundraiser.donations.map((d) => [d.id, d.seatsUsed != null ? String(d.seatsUsed) : ""]))
  );

  const selectedLevel = fundraiser.sponsorshipLevels.find((l) => l.id === form.sponsorshipLevelId);

  useEffect(() => {
    setSeatsValues(
      Object.fromEntries(fundraiser.donations.map((d) => [d.id, d.seatsUsed != null ? String(d.seatsUsed) : ""]))
    );
  }, [fundraiser.donations]);

  useEffect(() => {
    if (showForm) {
      fetch("/api/partners").then((r) => r.json()).then((d) => setPartners(Array.isArray(d) ? d.filter((p: PartnerOption) => p.organizationName).sort((a: PartnerOption, b: PartnerOption) => (a.organizationName ?? "").localeCompare(b.organizationName ?? "")) : [])).catch(() => {});
      fetch("/api/people").then((r) => r.json()).then((d) => setPeople(Array.isArray(d) ? d.filter((p: Person) => p.firstName || p.lastName).sort((a: Person, b: Person) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)) : [])).catch(() => {});
      const eventId = fundraiser.event?.id;
      if (eventId) {
        fetch(`/api/events/${eventId}/invites`)
          .then((r) => r.json())
          .then((invites: { group?: string | null }[]) => {
            const groups = [...new Set(invites.map((i) => i.group).filter((g): g is string => !!g))].sort();
            setEventGroups(groups);
          })
          .catch(() => {});
      }
    }
  }, [showForm, fundraiser.event?.id]);

  useEffect(() => {
    const costPerSeat = (fundraiser.event?.ticketPrice ?? 0) + (fundraiser.event?.mealCost ?? 0);
    if (costPerSeat <= 0) return;
    const seats = selectedLevel?.seats;
    if (!seats || seats <= 0) return;
    const amount = parseFloat(form.amountDollars);
    if (isNaN(amount) || amount <= 0) return;
    const deductible = Math.max(0, amount - centsToDollars(costPerSeat * seats));
    setForm((prev) => ({ ...prev, taxDeductibleDollars: deductible.toFixed(2) }));
  }, [form.amountDollars, selectedLevel, fundraiser.event]);

  const filteredPeople = personSearch
    ? people.filter((p) => {
        const q = personSearch.toLowerCase();
        return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          `${p.lastName}, ${p.firstName}`.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const hasEvent = !!fundraiser.event;

  async function updateSeatsUsed(donationId: string, value: string) {
    const parsed = value === "" ? null : parseInt(value);
    if (parsed !== null && isNaN(parsed)) return;
    setUpdatingSeatsId(donationId);
    try {
      await fetch(`/api/fundraisers/${fundraiser.id}/donations/${donationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatsUsed: parsed }),
      });
      onRefresh();
      setSeatsSavedId(donationId);
      setTimeout(() => setSeatsSavedId(null), 3000);
    } finally {
      setUpdatingSeatsId(null);
    }
  }

  async function handleSaveSeats(donationId: string, value: string) {
    const parsed = value === "" ? null : parseInt(value);
    if (parsed !== null && isNaN(parsed)) return;

    if (parsed !== null) {
      const donation = fundraiser.donations.find((d) => d.id === donationId);
      const eventId = fundraiser.event?.id;
      const group = donation?.partner?.organizationName ?? donation?.donorName ?? null;

      if (eventId && group) {
        const res = await fetch(`/api/events/${eventId}/invites`);
        const allInvites = (await res.json()) as Array<{ group: string | null; isPlaceholder: boolean; tableId: string | null }>;
        const groupInvites = allInvites.filter((i) => i.group === group);
        const namedCount = groupInvites.filter((i) => !i.isPlaceholder).length;
        const placeholders = groupInvites.filter((i) => i.isPlaceholder);
        const diff = Math.max(0, parsed - namedCount) - placeholders.length;

        if (diff < 0) {
          const toRemove = [...placeholders]
            .sort((a, b) => (a.tableId ? 1 : 0) - (b.tableId ? 1 : 0))
            .slice(0, Math.abs(diff));
          const tableAssignedCount = toRemove.filter((p) => p.tableId).length;
          if (tableAssignedCount > 0) {
            setConfirmPending({ donationId, value, tableAssignedCount });
            return;
          }
        }
      }
    }

    updateSeatsUsed(donationId, value);
  }

  function exportEmailsCSV() {
    const rows = [["First Name", "Last Name", "Email"]];
    for (const d of fundraiser.donations) {
      if (d.isAnonymous || !d.donorEmail) continue;
      const name = d.person
        ? [d.person.firstName, d.person.lastName]
        : (d.donorName || "").split(" ");
      const firstName = d.person ? d.person.firstName : (name[0] || "");
      const lastName = d.person ? d.person.lastName : name.slice(1).join(" ");
      rows.push([firstName, lastName, d.donorEmail]);
    }
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fundraiser.title.replace(/[^a-z0-9]/gi, "-")}-donors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      await fetch(`/api/fundraisers/${fundraiser.id}/sync-qb`, { method: "POST" });
      onRefresh();
    } finally {
      setSyncingAll(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amount = dollarsToCents(parseFloat(form.amountDollars));
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      const taxDeductibleCents = form.taxDeductibleDollars
        ? dollarsToCents(parseFloat(form.taxDeductibleDollars))
        : null;

      // Determine donor identity: partner > linked person > manual name
      const selectedPartner = partners.find((p) => p.id === form.partnerId);
      const donorName = selectedPartner
        ? selectedPartner.organizationName
        : selectedPerson
          ? `${selectedPerson.firstName} ${selectedPerson.lastName}`
          : form.donorName || null;
      const peopleId = !selectedPartner && selectedPerson ? selectedPerson.id : null;

      const res = await fetch(`/api/fundraisers/${fundraiser.id}/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          donorName,
          donorEmail: form.donorEmail || null,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
          taxDeductibleAmount: taxDeductibleCents,
          sponsorshipLevelId: form.sponsorshipLevelId || null,
          partnerId: form.partnerId || null,
          peopleId,
          group: !form.partnerId && form.group.trim() ? form.group.trim() : null,
        }),
      });
      if (!res.ok) throw new Error("Failed");

      setShowForm(false);
      setForm({ partnerId: "", donorName: "", donorEmail: "", amountDollars: "", paymentMethod: "cash", notes: "", taxDeductibleDollars: "", sponsorshipLevelId: "", group: "" });
      setSelectedPerson(null);
      setPersonSearch("");
      setManualDonorName(false);
      onRefresh();
    } catch {
      // error handled by UI
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">
          All Donations ({fundraiser.donations.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={exportEmailsCSV}
            className="text-sm border border-indigo-300 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-50"
          >
            Export Emails (CSV)
          </button>
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="text-sm border border-indigo-300 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-50 disabled:opacity-50"
          >
            {syncingAll ? "Syncing..." : "Sync All to QB"}
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setSelectedPerson(null); setPersonSearch(""); setManualDonorName(false); }}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
          >
            {showForm ? "Cancel" : "Add Manual Donation"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
          {/* Partner or guest donor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Partner (optional)</label>
              <select
                value={form.partnerId}
                onChange={(e) => setForm((p) => ({ ...p, partnerId: e.target.value, donorName: "" }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No partner / guest donor</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.organizationName}</option>
                ))}
              </select>
            </div>
            {!form.partnerId ? (
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">Donor</label>
                {selectedPerson ? (
                  <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 bg-white">
                    <span className="text-sm text-gray-800 flex-1">{selectedPerson.lastName}, {selectedPerson.firstName}</span>
                    <button type="button" onClick={() => { setSelectedPerson(null); setPersonSearch(""); }} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                  </div>
                ) : manualDonorName ? (
                  <div className="space-y-1">
                    <input
                      placeholder="Donor name"
                      value={form.donorName}
                      onChange={(e) => setForm((p) => ({ ...p, donorName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button type="button" onClick={() => { setManualDonorName(false); setForm((p) => ({ ...p, donorName: "" })); }} className="text-xs text-indigo-600 hover:underline">Search by name instead</button>
                  </div>
                ) : (
                  <div>
                    <input
                      placeholder="Search by name…"
                      value={personSearch}
                      onChange={(e) => { setPersonSearch(e.target.value); setShowPersonDropdown(true); setHighlightedPersonIndex(-1); }}
                      onFocus={() => setShowPersonDropdown(true)}
                      onBlur={() => setTimeout(() => setShowPersonDropdown(false), 150)}
                      onKeyDown={(e) => {
                        if (!showPersonDropdown || filteredPeople.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightedPersonIndex((i) => Math.min(i + 1, filteredPeople.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightedPersonIndex((i) => Math.max(i - 1, 0));
                        } else if (e.key === "Enter" && highlightedPersonIndex >= 0) {
                          e.preventDefault();
                          const p = filteredPeople[highlightedPersonIndex];
                          setSelectedPerson(p); setPersonSearch(""); setShowPersonDropdown(false); setHighlightedPersonIndex(-1);
                        } else if (e.key === "Escape") {
                          setShowPersonDropdown(false); setHighlightedPersonIndex(-1);
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {showPersonDropdown && filteredPeople.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {filteredPeople.map((p, idx) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onMouseDown={() => { setSelectedPerson(p); setPersonSearch(""); setShowPersonDropdown(false); setHighlightedPersonIndex(-1); }}
                              className={`w-full text-left px-3 py-2 text-sm ${idx === highlightedPersonIndex ? "bg-indigo-100" : "hover:bg-indigo-50"}`}
                            >
                              {p.lastName}, {p.firstName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button type="button" onClick={() => setManualDonorName(true)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Not in our system?</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-end pb-2">
                <span className="text-sm text-gray-500">
                  Donor name: <span className="font-medium text-gray-800">{partners.find((p) => p.id === form.partnerId)?.organizationName}</span>
                </span>
              </div>
            )}
          </div>
          <div className={`grid gap-3 ${!form.partnerId ? "grid-cols-2" : ""}`}>
            <input
              placeholder="Email (optional)"
              type="email"
              value={form.donorEmail}
              onChange={(e) => setForm((p) => ({ ...p, donorEmail: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {!form.partnerId && (
              <>
                <input
                  placeholder="Group (optional)"
                  value={form.group}
                  onChange={(e) => setForm((p) => ({ ...p, group: e.target.value }))}
                  list="event-groups-list"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {eventGroups.length > 0 && (
                  <datalist id="event-groups-list">
                    {eventGroups.map((g) => <option key={g} value={g} />)}
                  </datalist>
                )}
              </>
            )}
          </div>
          {fundraiser.sponsorshipLevels.length > 0 && (
            <div className="flex items-center gap-3">
              <select
                value={form.sponsorshipLevelId}
                onChange={(e) => {
                  const levelId = e.target.value;
                  const level = fundraiser.sponsorshipLevels.find((l) => l.id === levelId);
                  setForm((p) => ({
                    ...p,
                    sponsorshipLevelId: levelId,
                    amountDollars: level ? centsToDollars(level.amount).toString() : p.amountDollars,
                  }));
                }}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No sponsorship level</option>
                {fundraiser.sponsorshipLevels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {formatCurrency(l.amount)}{l.seats ? ` (${l.seats} seats)` : ""}
                  </option>
                ))}
              </select>
              {selectedLevel?.seats != null && selectedLevel.seats > 0 && (
                <span className="text-xs text-gray-500 shrink-0">{selectedLevel.seats} seat{selectedLevel.seats !== 1 ? "s" : ""} — placeholders will be added to the invite list automatically</span>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Amount ($)"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amountDollars}
              onChange={(e) => setForm((p) => ({ ...p, amountDollars: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="ach">ACH</option>
              <option value="online">Online</option>
              <option value="pledge">Pledge</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Tax-Deductible Amount ($) (optional)"
              type="number"
              step="0.01"
              min="0"
              value={form.taxDeductibleDollars}
              onChange={(e) => setForm((p) => ({ ...p, taxDeductibleDollars: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Donation"}
          </button>
        </form>
      )}

      {fundraiser.donations.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No donations yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Donor</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Tax-Deductible</th>
                <th className="px-4 py-2">Method</th>
                {hasEvent && <th className="px-4 py-2">Sponsored</th>}
                {hasEvent && <th className="px-4 py-2">Used</th>}
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">QB</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fundraiser.donations.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div>
                      {d.isAnonymous
                        ? "Anonymous"
                        : d.partner
                          ? d.partner.organizationName
                          : d.person
                            ? `${d.person.firstName} ${d.person.lastName}`
                            : d.donorName || "Unknown"}
                      {d.tributeType && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({d.tributeType === "in_honor_of" ? "In honor of" : "In memory of"} {d.tributeName})
                        </span>
                      )}
                      {d.sponsorshipLevel && (
                        <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {d.sponsorshipLevel.name}
                        </span>
                      )}
                      {d.partner && (
                        <span className="ml-1 text-xs text-gray-400">Partner</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-medium">{formatCurrency(d.amount)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatCurrency(d.taxDeductibleAmount ?? d.amount)}</td>
                  <td className="px-4 py-2 capitalize">{d.paymentMethod === "ach" ? "ACH" : d.paymentMethod}</td>
                  {hasEvent && (
                    <td className="px-4 py-2 text-gray-500 text-center">
                      {d.sponsoredSeats ?? "—"}
                    </td>
                  )}
                  {hasEvent && (
                    <td className="px-4 py-2">
                      {d.sponsoredSeats != null && d.sponsoredSeats > 0 ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={d.sponsoredSeats}
                            value={seatsValues[d.id] ?? ""}
                            placeholder="0"
                            disabled={updatingSeatsId === d.id}
                            onChange={(e) => { setSeatsSavedId(null); setSeatsValues((prev) => ({ ...prev, [d.id]: e.target.value })); }}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveSeats(d.id, seatsValues[d.id] ?? ""); if (e.key === "Escape") { setSeatsValues((prev) => ({ ...prev, [d.id]: d.seatsUsed != null ? String(d.seatsUsed) : "" })); setConfirmPending(null); } }}
                            className="w-16 border border-gray-300 rounded px-2 py-0.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                          />
                          {confirmPending?.donationId === d.id ? (
                            <span className="text-xs text-amber-700 whitespace-nowrap flex items-center gap-1">
                              {confirmPending.tableAssignedCount} table-assigned seat{confirmPending.tableAssignedCount !== 1 ? "s" : ""} will be removed.
                              <button
                                onClick={() => { updateSeatsUsed(confirmPending.donationId, confirmPending.value); setConfirmPending(null); }}
                                className="font-semibold text-red-600 hover:text-red-800 underline"
                              >Confirm</button>
                              <span className="text-gray-400">·</span>
                              <button
                                onClick={() => { setSeatsValues((prev) => ({ ...prev, [d.id]: d.seatsUsed != null ? String(d.seatsUsed) : "" })); setConfirmPending(null); }}
                                className="text-gray-500 hover:text-gray-700 underline"
                              >Cancel</button>
                            </span>
                          ) : (seatsValues[d.id] ?? "") !== (d.seatsUsed != null ? String(d.seatsUsed) : "") && updatingSeatsId !== d.id ? (
                            <>
                              <button
                                onClick={() => handleSaveSeats(d.id, seatsValues[d.id] ?? "")}
                                className="text-green-600 hover:text-green-800 font-bold text-sm px-1"
                                title="Save"
                              >✓</button>
                              <button
                                onClick={() => setSeatsValues((prev) => ({ ...prev, [d.id]: d.seatsUsed != null ? String(d.seatsUsed) : "" }))}
                                className="text-gray-400 hover:text-gray-600 font-bold text-sm px-1"
                                title="Cancel"
                              >✕</button>
                            </>
                          ) : seatsSavedId === d.id ? (
                            <span className="text-xs text-green-600 whitespace-nowrap">Invite list updated</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2">
                    <StatusBadge status={d.approvalStatus} />
                  </td>
                  <td className="px-4 py-2">
                    {d.paymentMethod === "zeffy"
                      ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Via Zeffy</span>
                      : d.paymentMethod === "stripe"
                      ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Via Stripe</span>
                      : <QBSyncBadge status={d.qbSyncStatus} />}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(d.donatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ApprovalsTab({
  fundraiser,
  pending,
  onRefresh,
}: {
  fundraiser: Fundraiser;
  pending: Donation[];
  onRefresh: () => void;
}) {
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleApproval(donationId: string, status: "APPROVED" | "REJECTED") {
    setProcessing(donationId);
    try {
      const res = await fetch(
        `/api/fundraisers/${fundraiser.id}/donations/${donationId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalStatus: status }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      // handled
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-sm font-medium text-gray-900 mb-4">
        Pending Approvals ({pending.length})
      </h3>
      {pending.length === 0 ? (
        <p className="text-sm text-gray-500">No donations pending approval.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((d) => (
            <div key={d.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {d.donorName || "Unknown Donor"}
                  </p>
                  {d.donorEmail && (
                    <p className="text-xs text-gray-500">{d.donorEmail}</p>
                  )}
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(d.amount)}</span>
              </div>
              {d.notes && <p className="text-xs text-gray-600 mb-2">{d.notes}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproval(d.id, "APPROVED")}
                  disabled={processing === d.id}
                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleApproval(d.id, "REJECTED")}
                  disabled={processing === d.id}
                  className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  fundraiser,
  onRefresh,
  onDelete,
}: {
  fundraiser: Fundraiser;
  onRefresh: () => void;
  onDelete: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggleActive() {
    setSaving(true);
    try {
      const res = await fetch(`/api/fundraisers/${fundraiser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !fundraiser.isActive }),
      });
      if (res.ok) onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const syncedDonations = fundraiser.donations.some((d) => d.qbSyncStatus !== "NOT_SYNCED");
    if (syncedDonations) {
      alert("This fundraiser has donations that have been synced to QuickBooks and cannot be deleted.");
      return;
    }

    if (!confirm("Delete this fundraiser and all its donations? This cannot be undone.")) return;

    let alsoDeleteEvent = false;
    if (fundraiser.event) {
      alsoDeleteEvent = confirm(
        `This fundraiser is linked to event "${fundraiser.event.title}". Delete the event and all its invites too?`
      );
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/fundraisers/${fundraiser.id}`, { method: "DELETE" });
      if (!res.ok) return;
      if (alsoDeleteEvent && fundraiser.event) {
        await fetch(`/api/events/${fundraiser.event.id}`, { method: "DELETE" });
      }
      onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Fundraiser Status</h3>
        <button
          onClick={toggleActive}
          disabled={saving}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
            fundraiser.isActive
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {saving ? "Updating..." : fundraiser.isActive ? "Deactivate Fundraiser" : "Activate Fundraiser"}
        </button>
      </div>

      {fundraiser.sponsorshipLevels.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Public Donation Link</h3>
          <p className="text-sm text-gray-600 mb-2">Share this link for people to donate online via Stripe:</p>
          <code className="text-sm bg-gray-100 px-3 py-1.5 rounded block">
            {typeof window !== "undefined" ? window.location.origin : ""}/donate/{fundraiser.slug}
          </code>
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded-lg p-5">
        <h3 className="text-sm font-medium text-red-800 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-600 mb-3">
          Deleting this fundraiser will permanently remove all donation records.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Fundraiser"}
        </button>
      </div>
    </div>
  );
}

function NoticesTab({
  pendingDonations,
  sponsorshipsWithOpenSeats,
}: {
  pendingDonations: Donation[];
  sponsorshipsWithOpenSeats: Donation[];
}) {
  const totalCount = pendingDonations.length + sponsorshipsWithOpenSeats.length;

  return (
    <div className="max-w-2xl space-y-3">
      {totalCount === 0 ? (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center gap-2">
          <span>✓</span>
          <span>No notices — everything looks good!</span>
        </div>
      ) : (
        <>
          {pendingDonations.length > 0 && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <span>⚠</span>
                <div>
                  <p className="font-medium">{pendingDonations.length} donation{pendingDonations.length !== 1 ? "s" : ""} pending approval:</p>
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    {pendingDonations.map((d) => (
                      <li key={d.id} className="font-medium">
                        {d.isAnonymous ? "Anonymous" : d.person ? `${d.person.firstName} ${d.person.lastName}` : d.donorName || "Unknown"}
                        {" — "}{d.paymentMethod}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {sponsorshipsWithOpenSeats.length > 0 && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <span>⚠</span>
                <div>
                  <p className="font-medium">{sponsorshipsWithOpenSeats.length} sponsorship{sponsorshipsWithOpenSeats.length !== 1 ? "s have" : " has"} unassigned seats:</p>
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    {sponsorshipsWithOpenSeats.map((d) => (
                      <li key={d.id}>
                        <span className="font-medium">{d.person ? `${d.person.firstName} ${d.person.lastName}` : d.donorName || "Unknown"}</span>
                        {" — "}{(d.seatsUsed ?? 0)} of {d.sponsoredSeats} seat{d.sponsoredSeats !== 1 ? "s" : ""} filled
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function QBSyncBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SYNCED: "bg-green-100 text-green-700",
    ERROR: "bg-red-100 text-red-700",
    NOT_SYNCED: "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    SYNCED: "Synced",
    ERROR: "Error",
    NOT_SYNCED: "Not Synced",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || "bg-gray-100 text-gray-500"}`}>
      {labels[status] || status}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    AUTO_APPROVED: "bg-green-100 text-green-700",
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    AUTO_APPROVED: "Approved",
    APPROVED: "Approved",
    PENDING: "Pending",
    REJECTED: "Rejected",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || "bg-gray-100 text-gray-500"}`}>
      {labels[status] || status}
    </span>
  );
}

const SOLICITATION_STATUSES = ["PENDING", "SENT", "DONATED", "DECLINED"];
const SOLICITATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  SENT: "Sent",
  DONATED: "Donated",
  DECLINED: "Declined",
};
const SOLICITATION_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-100 text-blue-700",
  DONATED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-600",
};

function SolicitationsTab({
  fundraiserId,
  solicitations,
  onRefresh,
}: {
  fundraiserId: string;
  solicitations: Solicitation[];
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const existingPeopleIds = solicitations.map((s) => s.person.id);

  async function handleStatusChange(solId: string, status: string) {
    setUpdatingId(solId);
    await fetch(`/api/fundraisers/${fundraiserId}/solicitations/${solId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    onRefresh();
  }

  async function handleRemove(solId: string) {
    setRemovingId(solId);
    await fetch(`/api/fundraisers/${fundraiserId}/solicitations/${solId}`, { method: "DELETE" });
    setRemovingId(null);
    onRefresh();
  }

  function exportCSV() {
    const filtered = solicitations.filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return `${s.person.firstName} ${s.person.lastName}`.toLowerCase().includes(q);
    });
    const rows = [
      ["First Name", "Last Name", "Email 1", "Email 2", "Status"],
      ...filtered.map((s) => [
        s.person.firstName,
        s.person.lastName,
        s.person.email1 ?? "",
        s.person.email2 ?? "",
        SOLICITATION_STATUS_LABELS[s.status] ?? s.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ask-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = solicitations.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${s.person.firstName} ${s.person.lastName}`.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-sm font-medium text-gray-900">Ask List ({solicitations.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="text-sm border border-indigo-300 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
          >
            Add People
          </button>
        </div>
      </div>

      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Search ask list..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">
          {solicitations.length === 0 ? "No one on the ask list yet. Add people above." : "No matching people."}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-indigo-900">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-indigo-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/people/${s.person.id}`} className="text-indigo-600 hover:underline font-medium">
                    {s.person.lastName}, {s.person.firstName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {s.person.email1 || s.person.email2 || "—"}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={s.status}
                    onChange={(e) => handleStatusChange(s.id, e.target.value)}
                    disabled={updatingId === s.id}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-indigo-500 ${SOLICITATION_STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {SOLICITATION_STATUSES.map((st) => (
                      <option key={st} value={st}>{SOLICITATION_STATUS_LABELS[st]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  {removingId === s.id ? (
                    <span className="text-xs text-gray-400">Removing…</span>
                  ) : (
                    <button
                      onClick={() => handleRemove(s.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <AddSolicitationsModal
          fundraiserId={fundraiserId}
          existingPeopleIds={existingPeopleIds}
          onClose={() => setShowModal(false)}
          onAdded={onRefresh}
        />
      )}
    </div>
  );
}
