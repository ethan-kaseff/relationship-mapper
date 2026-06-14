"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatCurrency, dollarsToCents, centsToDollars } from "@/lib/currency";
import AddSolicitationsModal from "@/components/fundraisers/AddSolicitationsModal";
import FundraiserEventSection from "@/components/fundraisers/FundraiserEventSection";
import FundraiserNoticeManager, { type DonationForEval } from "@/components/fundraisers/FundraiserNoticeManager";
import PledgesTab, { type Pledge } from "@/components/fundraisers/PledgesTab";
import CommitteeReportTab from "@/components/fundraisers/CommitteeReportTab";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  phoneNumber: string | null;
  email1: string | null;
  email2: string | null;
  communicationMethod: { name: string } | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  tags: { tag: { id: string; name: string } }[];
  partnerRoles: { partner: { organizationType: { typeName: string } | null } }[];
}

interface PartnerOption { id: string; organizationName: string | null; }

interface SponsorshipLevel {
  id: string;
  name: string;
  amount: number;
  seats: number | null;
  valetPasses: number | null;
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
  sponsorshipLevel: Pick<SponsorshipLevel, "id" | "name" | "amount" | "seats" | "valetPasses"> | null;
  partnerId: string | null;
  partner: PartnerOption | null;
  sponsoredSeats: number | null;
  seatsUsed: number | null;
  seatsReleased: number | null;
  attendancePlan: string;
  seatsChangeNote: string | null;
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
  calWrittenAt: string | null;
  calSentAt: string | null;
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
  solicitorTagId: string | null;
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

// Ask-list rows are always person-backed (the bulk-add flow requires a person)
type AskListSolicitation = Pledge & { person: NonNullable<Pledge["person"]> };

type Tab = "overview" | "levels" | "donations" | "solicitations" | "pledges" | "report" | "approvals" | "notices" | "settings";

export default function FundraiserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "SYSTEM_ADMIN" || session?.user?.role === "OFFICE_ADMIN";
  const [fundraiser, setFundraiser] = useState<Fundraiser | null>(null);
  const [solicitations, setSolicitations] = useState<Pledge[]>([]);
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

  // Personal solicitations (pledges) live on every fundraiser; the email/mail
  // Ask List only exists on fundraisers without a linked event (invites cover that).
  const pledges = solicitations.filter((s) => s.channel === "PERSONAL");
  const askList = solicitations.filter(
    (s): s is AskListSolicitation => s.channel !== "PERSONAL" && s.person !== null
  );
  const allPeopleIds = solicitations.flatMap((s) => (s.person ? [s.person.id] : []));
  const allPartnerIds = solicitations.flatMap((s) => (s.partner ? [s.partner.id] : []));

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "levels", label: "Sponsorship Levels", badge: fundraiser.sponsorshipLevels.length || undefined },
    ...(!fundraiser.event ? [{ key: "solicitations" as Tab, label: "Ask List", badge: askList.length || undefined }] : []),
    { key: "pledges", label: "Pledges", badge: pledges.length || undefined },
    ...(pledges.length ? [{ key: "report" as Tab, label: "Committee Report" }] : []),
    { key: "donations", label: "Donations" },
    { key: "approvals", label: "Name Approval", badge: pendingDonations.length || undefined },
    { key: "notices", label: "Notices", badge: totalNoticeCount || undefined },
    ...(isAdmin ? [{ key: "settings" as Tab, label: "Settings" }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print-hide">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{fundraiser.title}</h1>
          {fundraiser.event && (
            <div className="text-sm">
              <span className="text-gray-500">Event:</span>{" "}
              <Link href={`/events/${fundraiser.event.id}`} className="text-indigo-600 hover:underline">
                ↗ {fundraiser.event.title}
              </Link>
            </div>
          )}
        </div>
        <Link href="/fundraisers" className="text-indigo-600 hover:underline text-sm">
          Back to Fundraisers
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 print-hide">
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
      {tab === "donations" && <DonationsTab fundraiser={fundraiser} solicitations={solicitations} onRefresh={() => { load(); loadSolicitations(); }} />}
      {tab === "solicitations" && !fundraiser.event && (
        <SolicitationsTab
          fundraiserId={fundraiser.id}
          solicitations={askList}
          existingPeopleIds={allPeopleIds}
          onRefresh={loadSolicitations}
        />
      )}
      {tab === "pledges" && (
        <PledgesTab
          fundraiserId={fundraiser.id}
          pledges={pledges}
          solicitorTagId={fundraiser.solicitorTagId}
          sponsorshipLevels={fundraiser.sponsorshipLevels}
          donations={fundraiser.donations}
          existingPeopleIds={allPeopleIds}
          existingPartnerIds={allPartnerIds}
          onRefresh={loadSolicitations}
        />
      )}
      {tab === "report" && <CommitteeReportTab fundraiserId={fundraiser.id} />}
      {tab === "approvals" && <ApprovalsTab fundraiser={fundraiser} pending={pendingDonations} onRefresh={() => { load(); loadSolicitations(); }} />}
      {tab === "notices" && (
        <NoticesTab
          fundraiserId={fundraiser.id}
          donations={fundraiser.donations}
          pendingDonations={pendingDonations}
          sponsorshipsWithOpenSeats={sponsorshipsWithOpenSeats}
          isAdmin={isAdmin}
        />
      )}
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
  const [form, setForm] = useState({ name: "", amountDollars: "", seats: "", valet: "", description: "" });

  function resetForm() {
    setForm({ name: "", amountDollars: "", seats: "", valet: "", description: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(level: SponsorshipLevel) {
    setForm({
      name: level.name,
      amountDollars: centsToDollars(level.amount).toString(),
      seats: level.seats != null ? String(level.seats) : "",
      valet: level.valetPasses != null ? String(level.valetPasses) : "",
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
      const valetPasses = form.valet !== "" ? parseInt(form.valet) : null;
      const body = { name: form.name, amount, seats, valetPasses, description: form.description || null };
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Valet passes (optional)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 4 — leave blank for levels without valet"
                value={form.valet}
                onChange={(e) => setForm((p) => ({ ...p, valet: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
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
          <div className="overflow-x-auto">
          <table className="w-max text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Level</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Amount</th>
                {hasEvent && <th className="text-left px-4 py-2 font-medium text-gray-500">Seats</th>}
                <th className="text-left px-4 py-2 font-medium text-gray-500">Valet</th>
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
                  <td className="px-4 py-3 text-gray-600">{level.valetPasses != null && level.valetPasses > 0 ? level.valetPasses : <span className="text-gray-400">—</span>}</td>
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
          </div>
        ) : null}
      </div>
    </div>
  );
}

const ATTENDANCE_PLAN_LABELS: Record<string, string> = {
  UNKNOWN: "Unknown",
  USING_SEATS: "Using their seats",
  OTHER_TABLE: "Coming — other table",
  NOT_ATTENDING: "Not attending",
};

function DonationsTab({ fundraiser, solicitations, onRefresh }: { fundraiser: Fundraiser; solicitations: Pledge[]; onRefresh: () => void }) {
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
  const [seatsNoteValues, setSeatsNoteValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fundraiser.donations.map((d) => [d.id, d.seatsChangeNote ?? ""]))
  );
  const [notesSavedId, setNotesSavedId] = useState<string | null>(null);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [invitedPeopleIds, setInvitedPeopleIds] = useState<Set<string>>(new Set());
  const [releasedValues, setReleasedValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fundraiser.donations.map((d) => [d.id, d.seatsReleased != null ? String(d.seatsReleased) : ""]))
  );
  const [seatPlanError, setSeatPlanError] = useState<string | null>(null);
  const [seatReducePending, setSeatReducePending] = useState<{
    donationId: string;
    value: string;
    group: string;
    removeCount: number;
    namedInvites: { id: string; name: string; tableId: string | null }[];
  } | null>(null);
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());
  const [copiedNames, setCopiedNames] = useState(false);

  const selectedLevel = fundraiser.sponsorshipLevels.find((l) => l.id === form.sponsorshipLevelId);

  useEffect(() => {
    setSeatsValues(
      Object.fromEntries(fundraiser.donations.map((d) => [d.id, d.seatsUsed != null ? String(d.seatsUsed) : ""]))
    );
    setSeatsNoteValues(
      Object.fromEntries(fundraiser.donations.map((d) => [d.id, d.seatsChangeNote ?? ""]))
    );
    setReleasedValues(
      Object.fromEntries(fundraiser.donations.map((d) => [d.id, d.seatsReleased != null ? String(d.seatsReleased) : ""]))
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
          .then((invites: { group?: string | null; peopleId?: string | null }[]) => {
            const groups = [...new Set(invites.map((i) => i.group).filter((g): g is string => !!g))].sort();
            setEventGroups(groups);
            setInvitedPeopleIds(new Set(invites.map((i) => i.peopleId).filter((x): x is string => !!x)));
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

  const valetSponsors = fundraiser.donations
    .filter((d) => (d.sponsorshipLevel?.valetPasses ?? 0) > 0)
    .map((d) => ({ name: donorRowName(d), level: d.sponsorshipLevel?.name ?? "", passes: d.sponsorshipLevel?.valetPasses ?? 0 }));
  const totalValet = valetSponsors.reduce((sum, v) => sum + v.passes, 0);
  function exportValetCSV() {
    const rows = [["Sponsor", "Level", "Valet Passes"], ...valetSponsors.map((v) => [v.name, v.level, String(v.passes)])];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "valet-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Flag donors with no connection to this event/fundraiser (likely a wrong pick)
  const solicitedPeopleIds = new Set(solicitations.flatMap((s) => (s.person ? [s.person.id] : [])));
  const solicitedPartnerIds = new Set(solicitations.flatMap((s) => (s.partner ? [s.partner.id] : [])));
  const selectedPartnerOrg = partners.find((p) => p.id === form.partnerId);
  const donorNotConnected =
    hasEvent &&
    (form.partnerId
      ? !solicitedPartnerIds.has(form.partnerId) &&
        !(selectedPartnerOrg?.organizationName &&
          eventGroups.some((g) => g.toLowerCase() === (selectedPartnerOrg.organizationName ?? "").toLowerCase()))
      : selectedPerson
      ? !invitedPeopleIds.has(selectedPerson.id) && !solicitedPeopleIds.has(selectedPerson.id)
      : false);

  async function saveSeatPlan(donationId: string, body: { seatsReleased?: number | null; attendancePlan?: string }) {
    setSeatPlanError(null);
    const res = await fetch(`/api/fundraisers/${fundraiser.id}/donations/${donationId}/seat-plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setSeatPlanError(data?.error ?? "Failed to save seat plan");
    }
    onRefresh();
  }

  async function saveCal(donationId: string, field: "calWrittenAt" | "calSentAt", value: string) {
    await fetch(`/api/fundraisers/${fundraiser.id}/donations/${donationId}/cal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    onRefresh();
  }

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
        const allInvites = (await res.json()) as Array<{ id: string; group: string | null; isPlaceholder: boolean; tableId: string | null; guestName: string | null; person: { firstName: string; lastName: string } | null }>;
        const groupInvites = allInvites.filter((i) => i.group === group);
        const named = groupInvites.filter((i) => !i.isPlaceholder);
        const namedCount = named.length;
        const placeholders = groupInvites.filter((i) => i.isPlaceholder);

        // Reducing below the number of real (named) guests means a person has
        // to come off the list. Never auto-delete a named guest — let staff pick.
        if (parsed < namedCount) {
          setSelectedToRemove(new Set());
          setSeatReducePending({
            donationId,
            value,
            group,
            removeCount: namedCount - parsed,
            namedInvites: named.map((i) => ({
              id: i.id,
              name: i.person ? `${i.person.firstName} ${i.person.lastName}` : (i.guestName ?? "Guest"),
              tableId: i.tableId,
            })),
          });
          return;
        }

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

  async function confirmSeatReduce() {
    if (!seatReducePending) return;
    const eventId = fundraiser.event?.id;
    const { donationId, value } = seatReducePending;
    setUpdatingSeatsId(donationId);
    for (const inviteId of selectedToRemove) {
      await fetch(`/api/events/${eventId}/invites/${inviteId}`, { method: "DELETE" });
    }
    setSeatReducePending(null);
    await updateSeatsUsed(donationId, value);
  }

  function cancelSeatReduce() {
    if (seatReducePending) {
      const d = fundraiser.donations.find((x) => x.id === seatReducePending.donationId);
      setSeatsValues((prev) => ({ ...prev, [seatReducePending.donationId]: d?.seatsUsed != null ? String(d.seatsUsed) : "" }));
    }
    setSeatReducePending(null);
  }

  async function saveSeatsNote(donationId: string) {
    setSavingNoteId(donationId);
    try {
      const donation = fundraiser.donations.find((d) => d.id === donationId);
      await fetch(`/api/fundraisers/${fundraiser.id}/donations/${donationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatsUsed: donation?.seatsUsed ?? null,
          seatsChangeNote: seatsNoteValues[donationId] ?? null,
        }),
      });
      onRefresh();
      setNotesSavedId(donationId);
      setTimeout(() => setNotesSavedId(null), 3000);
    } finally {
      setSavingNoteId(null);
    }
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
    <div className="space-y-4">
      {valetSponsors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Valet Parking — {totalValet} pass{totalValet !== 1 ? "es" : ""} across {valetSponsors.length} sponsor{valetSponsors.length !== 1 ? "s" : ""}</h3>
            <button onClick={exportValetCSV} className="text-xs border border-indigo-300 text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-50">Export CSV</button>
          </div>
          <ul className="text-sm divide-y divide-gray-100">
            {valetSponsors.map((v, i) => (
              <li key={i} className="flex justify-between py-1">
                <span className="text-gray-800">{v.name} <span className="text-gray-400 text-xs">({v.level})</span></span>
                <span className="font-medium text-gray-700">{v.passes}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
          {donorNotConnected && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
              ⚠️ This donor isn&apos;t on the event&apos;s invite list or this fundraiser&apos;s pledge list — double-check it&apos;s the right person or organization.
            </p>
          )}
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
          {hasEvent && (() => {
            const sponsors = fundraiser.donations.filter((d) => (d.sponsoredSeats ?? 0) > 0);
            if (sponsors.length === 0) return null;
            const given = sponsors.reduce((n, d) => n + (d.sponsoredSeats ?? 0), 0);
            const using = sponsors.reduce((n, d) => n + (d.seatsUsed ?? 0), 0);
            const released = sponsors.reduce((n, d) => n + (d.seatsReleased ?? 0), 0);
            const unconfirmed = Math.max(0, given - using - released);
            return (
              <div className="mb-3 text-sm text-gray-600">
                Sponsored seats: <span className="font-medium text-gray-900">{given}</span>
                <span className="text-gray-400"> · </span>in use by sponsors: <span className="font-medium text-gray-900">{using}</span>
                <span className="text-gray-400"> · </span>released to us: <span className="font-medium text-gray-900">{released}</span>
                <span className="text-gray-400"> · </span>unconfirmed: <span className={`font-medium ${unconfirmed > 0 ? "text-amber-700" : "text-gray-900"}`}>{unconfirmed}</span>
              </div>
            );
          })()}
          {seatPlanError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {seatPlanError}
              <button onClick={() => setSeatPlanError(null)} className="float-right text-xs underline">Dismiss</button>
            </div>
          )}
          <div className="overflow-x-auto">
          <table className="w-max text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Donor</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Tax-Deductible</th>
                <th className="px-4 py-2">Method</th>
                {hasEvent && <th className="px-4 py-2" title="Seats included with their sponsorship">Sponsored</th>}
                {hasEvent && <th className="px-4 py-2" title="Seats we expect them to fill themselves">Using</th>}
                {hasEvent && <th className="px-4 py-2" title="Seats they're letting us give away">Released</th>}
                {hasEvent && <th className="px-4 py-2" title="Is the donor attending?">Seat Usage Plan</th>}
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">QB</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2" title="Contribution Acknowledgment Letter">CAL</th>
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
                    <td className={`px-4 py-2 ${d.sponsoredSeats != null && d.seatsUsed != null && d.seatsUsed < d.sponsoredSeats ? "bg-amber-50" : ""}`}>
                      {d.sponsoredSeats != null && d.sponsoredSeats > 0 ? (
                        <div className="space-y-2">
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
                          {d.sponsoredSeats != null && d.seatsUsed != null && d.seatsUsed < d.sponsoredSeats && (
                            <div className="text-xs text-amber-700 font-medium">
                              {d.sponsoredSeats - d.seatsUsed} unused seat{d.sponsoredSeats - d.seatsUsed !== 1 ? "s" : ""}
                            </div>
                          )}
                          <div className="space-y-1">
                            <textarea
                              rows={2}
                              value={seatsNoteValues[d.id] ?? ""}
                              onChange={(e) => { setNotesSavedId(null); setSeatsNoteValues((prev) => ({ ...prev, [d.id]: e.target.value })); }}
                              placeholder="Reason (optional)"
                              title="Reason for changing how many seats they're using — e.g. two guests canceled (optional)"
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1 resize-none focus:ring-1 focus:ring-indigo-400 focus:border-transparent"
                            />
                            {(seatsNoteValues[d.id] ?? "") !== (d.seatsChangeNote ?? "") && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveSeatsNote(d.id)}
                                  disabled={savingNoteId === d.id}
                                  className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  {savingNoteId === d.id ? "Saving…" : "Save note"}
                                </button>
                                <button
                                  onClick={() => setSeatsNoteValues((prev) => ({ ...prev, [d.id]: d.seatsChangeNote ?? "" }))}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >Cancel</button>
                                {notesSavedId === d.id && <span className="text-xs text-green-600">Saved</span>}
                              </div>
                            )}
                            {notesSavedId === d.id && (seatsNoteValues[d.id] ?? "") === (d.seatsChangeNote ?? "") && (
                              <span className="text-xs text-green-600">Saved</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  )}
                  {hasEvent && (
                    <td className="px-4 py-2">
                      {d.sponsoredSeats != null && d.sponsoredSeats > 0 ? (
                        <input
                          type="number"
                          min={0}
                          max={d.sponsoredSeats}
                          value={releasedValues[d.id] ?? ""}
                          placeholder="0"
                          onChange={(e) => setReleasedValues((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          onBlur={(e) => {
                            const parsed = e.target.value === "" ? null : parseInt(e.target.value);
                            if (parsed !== null && isNaN(parsed)) return;
                            if ((parsed ?? null) !== (d.seatsReleased ?? null)) saveSeatPlan(d.id, { seatsReleased: parsed });
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          className="w-16 border border-gray-300 rounded px-2 py-0.5 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  )}
                  {hasEvent && (
                    <td className="px-4 py-2">
                      {d.sponsoredSeats != null && d.sponsoredSeats > 0 ? (
                        <select
                          value={d.attendancePlan}
                          onChange={(e) => saveSeatPlan(d.id, { attendancePlan: e.target.value })}
                          className="border border-gray-300 rounded px-1.5 py-0.5 text-xs text-gray-700"
                        >
                          {Object.entries(ATTENDANCE_PLAN_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
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
                  <td className="px-4 py-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 w-12">Written</span>
                        <input
                          type="date"
                          value={d.calWrittenAt ? d.calWrittenAt.slice(0, 10) : ""}
                          onChange={(e) => saveCal(d.id, "calWrittenAt", e.target.value)}
                          className="border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-600"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 w-12">Sent</span>
                        <input
                          type="date"
                          value={d.calSentAt ? d.calSentAt.slice(0, 10) : ""}
                          onChange={(e) => saveCal(d.id, "calSentAt", e.target.value)}
                          className="border border-gray-200 rounded px-1 py-0.5 text-xs text-gray-600"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      {seatReducePending && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Reduce seats for {seatReducePending.group}</h2>
                <button
                  onClick={async () => {
                    const text = seatReducePending.namedInvites.map((i) => i.name).join("\n");
                    try {
                      await navigator.clipboard.writeText(text);
                      setCopiedNames(true);
                      setTimeout(() => setCopiedNames(false), 2000);
                    } catch { /* clipboard unavailable */ }
                  }}
                  className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-md px-2 py-1 hover:bg-indigo-50"
                  title="Copy the current guest list to paste into an email or text"
                >
                  {copiedNames ? "Copied!" : "Copy names"}
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                This group has {seatReducePending.namedInvites.length} named guest{seatReducePending.namedInvites.length !== 1 ? "s" : ""}, but you&apos;re setting {seatReducePending.value} seat{seatReducePending.value !== "1" ? "s" : ""}. Choose {seatReducePending.removeCount} to remove from the invite list.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {seatReducePending.namedInvites.map((inv) => {
                const checked = selectedToRemove.has(inv.id);
                const atCap = selectedToRemove.size >= seatReducePending.removeCount;
                return (
                  <label key={inv.id} className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${checked ? "bg-red-50" : "hover:bg-gray-50"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && atCap}
                      onChange={() => setSelectedToRemove((prev) => {
                        const next = new Set(prev);
                        if (next.has(inv.id)) next.delete(inv.id); else next.add(inv.id);
                        return next;
                      })}
                      className="accent-red-600 disabled:opacity-40"
                    />
                    <span className="text-sm text-gray-800 flex-1">{inv.name}</span>
                    {inv.tableId && <span className="text-xs text-amber-600">seated at a table</span>}
                  </label>
                );
              })}
            </div>
            <div className="p-4 border-t">
              <p className="text-xs text-gray-500 mb-2">
                {selectedToRemove.size} of {seatReducePending.removeCount} selected. Any remaining TBD seats for this group will also be cleared.
              </p>
              <div className="flex gap-3">
                <button onClick={cancelSeatReduce} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
                <button
                  onClick={confirmSeatReduce}
                  disabled={selectedToRemove.size !== seatReducePending.removeCount}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
                >
                  Remove {seatReducePending.removeCount} & save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
        Donor Names to Confirm ({pending.length})
      </h3>
      {pending.length === 0 ? (
        <p className="text-sm text-gray-500">No donor names waiting to be confirmed.</p>
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
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [savingTag, setSavingTag] = useState(false);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((data) => setTags(Array.isArray(data) ? data : []));
  }, []);

  async function handleSolicitorTagChange(tagId: string) {
    setSavingTag(true);
    try {
      const res = await fetch(`/api/fundraisers/${fundraiser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solicitorTagId: tagId || null }),
      });
      if (res.ok) onRefresh();
    } finally {
      setSavingTag(false);
    }
  }

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

      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-1">Solicitor Tag</h3>
        <p className="text-sm text-gray-600 mb-3">
          People with this tag appear in the Solicitor dropdown on the Pledges tab.
          Use a different tag per fundraiser to keep each committee&apos;s list separate.
        </p>
        <select
          value={fundraiser.solicitorTagId ?? ""}
          onChange={(e) => handleSolicitorTagChange(e.target.value)}
          disabled={savingTag}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="">— Default (people tagged &quot;Solicitor&quot;) —</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {savingTag && <p className="text-xs text-gray-400 mt-1">Saving…</p>}
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

function donorRowName(d: Donation): string {
  return d.isAnonymous ? "Anonymous" : d.person ? `${d.person.firstName} ${d.person.lastName}` : d.donorName || "Unknown";
}

function NoticesTab({
  fundraiserId,
  donations,
  pendingDonations,
  sponsorshipsWithOpenSeats,
  isAdmin,
}: {
  fundraiserId: string;
  donations: Donation[];
  pendingDonations: Donation[];
  sponsorshipsWithOpenSeats: Donation[];
  isAdmin: boolean;
}) {
  const [customNoticeRows, setCustomNoticeRows] = useState<string[][]>([]);
  const sponsorshipLevelNames = [...new Set(donations.map((d) => d.sponsorshipLevel?.name).filter((n): n is string => !!n))];

  const systemNoticeRows: string[][] = [
    ...pendingDonations.map((d) => [
      "Pending approval",
      donorRowName(d),
      d.person?.email1 || d.person?.email2 || "",
      d.sponsorshipLevel?.name ?? "",
      (d.amount / 100).toFixed(2),
      d.approvalStatus,
      d.qbSyncStatus,
      d.isRecurring ? "Yes" : "No",
      d.paymentMethod,
      d.sponsoredSeats != null ? String(d.sponsoredSeats) : "",
      d.seatsUsed != null ? String(d.seatsUsed) : "",
    ]),
    ...sponsorshipsWithOpenSeats.map((d) => [
      "Sponsorship has unassigned seats",
      donorRowName(d),
      d.person?.email1 || d.person?.email2 || "",
      d.sponsorshipLevel?.name ?? "",
      (d.amount / 100).toFixed(2),
      d.approvalStatus,
      d.qbSyncStatus,
      d.isRecurring ? "Yes" : "No",
      d.paymentMethod,
      d.sponsoredSeats != null ? String(d.sponsoredSeats) : "",
      d.seatsUsed != null ? String(d.seatsUsed) : "",
    ]),
  ];

  const NOTICE_XLSX_HEADERS = ["Name", "Email", "Sponsorship Level", "Amount ($)", "Approval Status", "QB Sync", "Recurring", "Payment Method", "Sponsored Seats", "Seats Used"];

  async function downloadAllNoticesXlsx() {
    const res = await fetch("/api/export/xlsx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "fundraiser-notices.xlsx",
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
    a.download = "fundraiser-notices.xlsx";
    a.click();
  }

  return (
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
              label: "Donations pending approval",
              count: pendingDonations.length,
              items: pendingDonations.map((d) => {
                const name = d.isAnonymous ? "Anonymous" : d.person ? `${d.person.firstName} ${d.person.lastName}` : d.donorName || "Unknown";
                return `${name} — ${d.paymentMethod}`;
              }),
            },
            {
              label: "Sponsorships with unassigned seats",
              count: sponsorshipsWithOpenSeats.length,
              items: sponsorshipsWithOpenSeats.map((d) => {
                const name = d.person ? `${d.person.firstName} ${d.person.lastName}` : d.donorName || "Unknown";
                return `${name} — ${d.seatsUsed ?? 0} of ${d.sponsoredSeats} seats filled`;
              }),
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
        <FundraiserNoticeManager
          fundraiserId={fundraiserId}
          donations={donations as DonationForEval[]}
          sponsorshipLevelNames={sponsorshipLevelNames}
          isAdmin={isAdmin}
          onEvaluatedRowsChange={setCustomNoticeRows}
        />
      </div>
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
  existingPeopleIds,
  onRefresh,
}: {
  fundraiserId: string;
  solicitations: AskListSolicitation[];
  existingPeopleIds: string[];
  onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
        <div className="overflow-x-auto">
        <table className="w-max text-sm">
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
        </div>
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
