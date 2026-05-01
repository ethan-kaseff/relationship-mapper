"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, dollarsToCents } from "@/lib/currency";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface Donation {
  id: string;
  amount: number;
  donorName: string | null;
  donorEmail: string | null;
  peopleId: string | null;
  person: Person | null;
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
  event: { id: string; title: string } | null;
  donations: Donation[];
}

type Tab = "overview" | "donations" | "approvals" | "settings";

export default function FundraiserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [fundraiser, setFundraiser] = useState<Fundraiser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
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

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error || !fundraiser) return <div className="text-red-600">{error}</div>;

  const pct = fundraiser.goalAmount > 0
    ? Math.min(100, Math.round((fundraiser.currentAmount / fundraiser.goalAmount) * 100))
    : 0;

  const pendingDonations = fundraiser.donations.filter((d) => d.approvalStatus === "PENDING");

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "donations", label: "Donations" },
    { key: "approvals", label: "Approvals", badge: pendingDonations.length },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{fundraiser.title}</h1>
          {fundraiser.event && (
            <Link href={`/events/${fundraiser.event.id}`} className="text-sm text-indigo-600 hover:underline">
              {fundraiser.event.title}
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
              <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab fundraiser={fundraiser} pct={pct} />}
      {tab === "donations" && <DonationsTab fundraiser={fundraiser} onRefresh={load} />}
      {tab === "approvals" && <ApprovalsTab fundraiser={fundraiser} pending={pendingDonations} onRefresh={load} />}
      {tab === "settings" && <SettingsTab fundraiser={fundraiser} onRefresh={load} onDelete={() => router.push("/fundraisers")} />}
    </div>
  );
}

function OverviewTab({ fundraiser, pct }: { fundraiser: Fundraiser; pct: number }) {
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
          <div>
            <span className="text-gray-500">Public URL:</span>{" "}
            <Link href={publicUrl} className="text-indigo-600 hover:underline" target="_blank">
              /donate/{fundraiser.slug}
            </Link>
          </div>
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
    </div>
  );
}

function DonationsTab({ fundraiser, onRefresh }: { fundraiser: Fundraiser; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [form, setForm] = useState({ donorName: "", donorEmail: "", amountDollars: "", paymentMethod: "cash" as string, notes: "", taxDeductibleDollars: "" });

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
      const res = await fetch(`/api/fundraisers/${fundraiser.id}/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          donorName: form.donorName || null,
          donorEmail: form.donorEmail || null,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
          taxDeductibleAmount: taxDeductibleCents,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowForm(false);
      setForm({ donorName: "", donorEmail: "", amountDollars: "", paymentMethod: "cash", notes: "", taxDeductibleDollars: "" });
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
            onClick={() => setShowForm(!showForm)}
            className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700"
          >
            {showForm ? "Cancel" : "Add Manual Donation"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Donor Name"
              value={form.donorName}
              onChange={(e) => setForm((p) => ({ ...p, donorName: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              placeholder="Email"
              type="email"
              value={form.donorEmail}
              onChange={(e) => setForm((p) => ({ ...p, donorEmail: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
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
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">QB</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fundraiser.donations.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {d.isAnonymous
                      ? "Anonymous"
                      : d.person
                        ? `${d.person.firstName} ${d.person.lastName}`
                        : d.donorName || "Unknown"}
                    {d.tributeType && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({d.tributeType === "in_honor_of" ? "In honor of" : "In memory of"} {d.tributeName})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium">{formatCurrency(d.amount)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatCurrency(d.taxDeductibleAmount ?? d.amount)}</td>
                  <td className="px-4 py-2 capitalize">{d.paymentMethod}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={d.approvalStatus} />
                  </td>
                  <td className="px-4 py-2">
                    <QBSyncBadge status={d.qbSyncStatus} />
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
    if (!confirm("Are you sure you want to delete this fundraiser and all its donations?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fundraisers/${fundraiser.id}`, { method: "DELETE" });
      if (res.ok) onDelete();
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
        <h3 className="text-sm font-medium text-gray-900 mb-1">Public Donation Link</h3>
        <p className="text-sm text-gray-600 mb-2">Share this link for people to donate online:</p>
        <code className="text-sm bg-gray-100 px-3 py-1.5 rounded block">
          {typeof window !== "undefined" ? window.location.origin : ""}/donate/{fundraiser.slug}
        </code>
      </div>

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
