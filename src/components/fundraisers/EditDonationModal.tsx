"use client";

import { useState } from "react";
import { centsToDollars, dollarsToCents } from "@/lib/currency";
import SeatReducePicker, { type NamedInvite } from "@/components/fundraisers/SeatReducePicker";

export interface EditableDonation {
  id: string;
  amount: number;
  donorName: string | null;
  donorEmail: string | null;
  peopleId: string | null;
  partnerId: string | null;
  person: { firstName: string; lastName: string } | null;
  partner: { organizationName: string | null } | null;
  sponsorshipLevelId: string | null;
  paymentMethod: string;
  donatedAt: string;
  taxDeductibleAmount: number | null;
  tributeType: string | null;
  tributeName: string | null;
  isAnonymous: boolean;
  notes: string | null;
  qbSyncStatus: string;
}

interface LevelOption {
  id: string;
  name: string;
  amount: number;
  seats: number | null;
}

interface DonationEditBody {
  amount: number;
  paymentMethod: string;
  donatedAt: string | null;
  taxDeductibleAmount: number | null;
  sponsorshipLevelId: string | null;
  tributeType: string | null;
  tributeName: string | null;
  isAnonymous: boolean;
  notes: string | null;
  donorName?: string | null;
  donorEmail?: string | null;
}

const PAYMENT_METHODS = ["cash", "check", "ach", "online", "pledge", "stripe", "other"];

export default function EditDonationModal({
  donation,
  fundraiserId,
  sponsorshipLevels,
  eventId,
  onClose,
  onSaved,
}: {
  donation: EditableDonation;
  fundraiserId: string;
  sponsorshipLevels: LevelOption[];
  eventId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const hasEvent = eventId != null;
  const isManual = !donation.peopleId && !donation.partnerId;
  const linkedName = donation.partner
    ? donation.partner.organizationName ?? "—"
    : donation.person
      ? `${donation.person.firstName} ${donation.person.lastName}`
      : null;

  const [amount, setAmount] = useState(String(centsToDollars(donation.amount)));
  const [donorName, setDonorName] = useState(donation.donorName ?? "");
  const [donorEmail, setDonorEmail] = useState(donation.donorEmail ?? "");
  const [paymentMethod, setPaymentMethod] = useState(donation.paymentMethod);
  const [donatedAt, setDonatedAt] = useState(donation.donatedAt ? donation.donatedAt.slice(0, 10) : "");
  const [taxDeductible, setTaxDeductible] = useState(
    donation.taxDeductibleAmount != null ? String(centsToDollars(donation.taxDeductibleAmount)) : ""
  );
  const [levelId, setLevelId] = useState(donation.sponsorshipLevelId ?? "");
  const [tributeType, setTributeType] = useState(donation.tributeType ?? "");
  const [tributeName, setTributeName] = useState(donation.tributeName ?? "");
  const [isAnonymous, setIsAnonymous] = useState(donation.isAnonymous);
  const [notes, setNotes] = useState(donation.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [pendingReduction, setPendingReduction] = useState<{
    body: DonationEditBody;
    group: string;
    targetSeats: number;
    removeCount: number;
    namedInvites: NamedInvite[];
  } | null>(null);
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());

  const qbSynced = donation.qbSyncStatus && donation.qbSyncStatus !== "NOT_SYNCED";

  async function handleDelete() {
    const qbNote = qbSynced
      ? "\n\n⚠️ This donation is synced to QuickBooks. Deleting it here will NOT remove it from QuickBooks — you'll need to adjust that there separately."
      : "";
    if (!confirm(`Delete this donation? This permanently removes the record and lowers the fundraiser total by this amount. This cannot be undone.${qbNote}`)) {
      return;
    }
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/fundraisers/${fundraiserId}/donations/${donation.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Failed to delete");
      return;
    }
    onSaved();
    onClose();
  }

  function buildBody(): DonationEditBody {
    const amountNum = parseFloat(amount);
    const taxNum = parseFloat(taxDeductible);
    return {
      amount: dollarsToCents(amountNum),
      paymentMethod,
      donatedAt: donatedAt || null,
      taxDeductibleAmount: taxDeductible !== "" && !isNaN(taxNum) ? dollarsToCents(taxNum) : null,
      sponsorshipLevelId: levelId || null,
      tributeType: tributeType || null,
      tributeName: tributeType ? tributeName.trim() || null : null,
      isAnonymous,
      notes: notes.trim() || null,
      ...(isManual ? { donorName: donorName.trim() || null, donorEmail: donorEmail.trim() || null } : {}),
    };
  }

  // Persist the edit. Expects setSaving(true) to have been called already.
  async function doSave(body: DonationEditBody) {
    const res = await fetch(`/api/fundraisers/${fundraiserId}/donations/${donation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const detail = Array.isArray(data?.details) && data.details[0]?.message;
      setError(detail || data?.error || "Failed to save");
      setSaving(false);
      return;
    }
    onSaved();
    onClose();
  }

  async function handleSave() {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    setSaving(true);
    setError("");

    const body = buildBody();

    // If switching to a level whose seat count is below the named guests already
    // on the linked event, staff must pick who comes off before we save. (The API
    // trims leftover placeholders on its own, but never auto-removes a real
    // person.) Same picker the donations "Using" editor uses.
    const levelChanged = (levelId || null) !== (donation.sponsorshipLevelId ?? null);
    const group = donation.partner?.organizationName ?? donation.donorName ?? null;
    if (levelChanged && eventId && group) {
      const newSeats = sponsorshipLevels.find((l) => l.id === levelId)?.seats ?? null;
      if (newSeats != null) {
        try {
          const res = await fetch(`/api/events/${eventId}/invites`);
          const all = (await res.json()) as Array<{ id: string; group: string | null; isPlaceholder: boolean; tableId: string | null; guestName: string | null; person: { firstName: string; lastName: string } | null }>;
          const named = all.filter((i) => i.group === group && !i.isPlaceholder);
          if (newSeats < named.length) {
            setSelectedToRemove(new Set());
            setPendingReduction({
              body,
              group,
              targetSeats: newSeats,
              removeCount: named.length - newSeats,
              namedInvites: named.map((i) => ({
                id: i.id,
                name: i.person ? `${i.person.firstName} ${i.person.lastName}` : (i.guestName ?? "Guest"),
                tableId: i.tableId,
              })),
            });
            setSaving(false);
            return;
          }
        } catch {
          // Couldn't load the invite list — fall through to a normal save.
        }
      }
    }

    await doSave(body);
  }

  // Staff confirmed which named guests to remove: delete them, then save.
  async function confirmReduction() {
    if (!pendingReduction) return;
    const { body } = pendingReduction;
    const ids = [...selectedToRemove];
    setPendingReduction(null);
    setSaving(true);
    setError("");
    for (const id of ids) {
      await fetch(`/api/events/${eventId}/invites/${id}`, { method: "DELETE" });
    }
    await doSave(body);
  }

  // Backing out of the picker cancels the whole level change.
  function cancelReduction() {
    setPendingReduction(null);
    setSelectedToRemove(new Set());
    setLevelId(donation.sponsorshipLevelId ?? "");
  }

  function toggleRemove(id: string) {
    setSelectedToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Edit Donation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {qbSynced && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
              ⚠️ This donation is synced to QuickBooks. Editing it here won&apos;t update the QuickBooks receipt — you&apos;ll need to adjust that separately.
            </p>
          )}

          {/* Donor */}
          {isManual ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Donor Name</label>
                <input type="text" value={donorName} onChange={(e) => setDonorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Donor Email</label>
                <input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Donor: <span className="font-medium text-gray-900">{linkedName}</span>
              <span className="text-xs text-gray-400 ml-1">(linked record — edit on their profile)</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Amount ($)</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tax-Deductible ($)</label>
              <input type="number" min="0" step="0.01" value={taxDeductible} placeholder="defaults to amount"
                onChange={(e) => setTaxDeductible(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm capitalize focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m === "ach" ? "ACH" : m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input type="date" value={donatedAt} onChange={(e) => setDonatedAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
          </div>

          {sponsorshipLevels.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sponsorship Level</label>
              <select value={levelId} onChange={(e) => setLevelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="">— None —</option>
                {sponsorshipLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Changing the level resets the sponsored seats and syncs the linked event, keeping any lower Using count you set.</p>
            </div>
          )}

          {/* Tributes don't apply to event-linked fundraisers, so hide the field there. */}
          {!hasEvent && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tribute</label>
                <select value={tributeType} onChange={(e) => setTributeType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="">— None —</option>
                  <option value="in_honor_of">In honor of</option>
                  <option value="in_memory_of">In memory of</option>
                </select>
              </div>
              {tributeType && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tribute Name</label>
                  <input type="text" value={tributeName} onChange={(e) => setTributeName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded accent-indigo-600" />
            <span className="text-sm text-gray-700">Anonymous donation</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="p-4 border-t flex items-center gap-3">
          <button onClick={handleDelete} disabled={deleting || saving}
            className="text-sm text-red-600 hover:text-red-700 hover:underline mr-auto disabled:opacity-50">
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving || deleting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
    {pendingReduction && (
      <SeatReducePicker
        group={pendingReduction.group}
        namedInvites={pendingReduction.namedInvites}
        removeCount={pendingReduction.removeCount}
        targetSeats={pendingReduction.targetSeats}
        selected={selectedToRemove}
        onToggle={toggleRemove}
        onCancel={cancelReduction}
        onConfirm={confirmReduction}
      />
    )}
    </>
  );
}
