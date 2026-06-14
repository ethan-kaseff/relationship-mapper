"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency, dollarsToCents, centsToDollars } from "@/lib/currency";
import AddPledgeModal from "@/components/fundraisers/AddPledgeModal";

export interface Pledge {
  id: string;
  status: string;
  channel: string;
  person: { id: string; firstName: string; lastName: string; email1: string | null; email2: string | null; listedAs: string | null } | null;
  partner: { id: string; organizationName: string | null; email: string | null; listedAs: string | null; logoUrl: string | null } | null;
  solicitor: { id: string; firstName: string; lastName: string } | null;
  sponsorshipLevel: { id: string; name: string; amount: number } | null;
  askAmount: number | null;
  pledgeAmount: number | null;
  pledgeDate: string | null;
  palWrittenAt: string | null;
  palSentAt: string | null;
  nfgEntered: boolean;
  nfgUpdated: boolean;
  formInDrive: boolean;
  solicitationNotes: SolicitationNoteEntry[];
}

export interface DonationCalInfo {
  id: string;
  peopleId: string | null;
  partnerId: string | null;
  calWrittenAt: string | null;
  calSentAt: string | null;
}

export interface LevelOption {
  id: string;
  name: string;
  amount: number;
}

export interface SolicitationNoteEntry {
  id: string;
  content: string;
  createdAt: string;
  author: { firstName: string; lastName: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Not Asked",
  SENT: "Asked",
  PLEDGED: "Pledged",
  DONATED: "Received",
  DECLINED: "Declined",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-100 text-blue-700",
  PLEDGED: "bg-yellow-100 text-yellow-800",
  DONATED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-700",
};

interface PersonOption {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  tags: { tagId: string }[];
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC", month: "numeric", day: "numeric", year: "2-digit" });
}

export default function PledgesTab({
  fundraiserId,
  pledges,
  solicitorTagId,
  sponsorshipLevels,
  donations,
  existingPeopleIds,
  existingPartnerIds,
  onRefresh,
}: {
  fundraiserId: string;
  pledges: Pledge[];
  solicitorTagId: string | null;
  sponsorshipLevels: LevelOption[];
  donations: DonationCalInfo[];
  existingPeopleIds: string[];
  existingPartnerIds: string[];
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [solicitorFilter, setSolicitorFilter] = useState("");
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [defaultTagId, setDefaultTagId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/people").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([peopleData, tagsData]) => {
      setPeople((Array.isArray(peopleData) ? peopleData : []).filter((p: PersonOption) => p.status === "ACTIVE"));
      const tag = (Array.isArray(tagsData) ? tagsData : []).find(
        (t: { id: string; name: string }) => t.name.toLowerCase() === "solicitor"
      );
      setDefaultTagId(tag?.id ?? null);
    });
  }, []);

  // Only people with the solicitor tag qualify: the fundraiser's configured
  // tag wins, otherwise a tag named "Solicitor". No tag → empty list.
  const effectiveTagId = solicitorTagId ?? defaultTagId;
  const solicitorOptions = useMemo(() => {
    if (!effectiveTagId) return [];
    return people
      .filter((p) => p.tags.some((t) => t.tagId === effectiveTagId))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }, [people, effectiveTagId]);

  const solicitorsInUse = useMemo(() => {
    const map = new Map<string, string>();
    pledges.forEach((p) => {
      if (p.solicitor) map.set(p.solicitor.id, `${p.solicitor.lastName}, ${p.solicitor.firstName}`);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [pledges]);

  const visible = useMemo(() => {
    let list = pledges;
    if (solicitorFilter) list = list.filter((p) => p.solicitor?.id === solicitorFilter);
    return [...list].sort((a, b) => {
      const nameA = a.partner?.organizationName ?? (a.person ? `${a.person.lastName}, ${a.person.firstName}` : "");
      const nameB = b.partner?.organizationName ?? (b.person ? `${b.person.lastName}, ${b.person.firstName}` : "");
      return nameA.localeCompare(nameB);
    });
  }, [pledges, solicitorFilter]);

  function calForPledge(pledge: Pledge): DonationCalInfo | null {
    const matches = donations.filter((d) =>
      pledge.partner ? d.partnerId === pledge.partner.id : pledge.person ? d.peopleId === pledge.person.id : false
    );
    if (matches.length === 0) return null;
    return matches.find((d) => d.calWrittenAt || d.calSentAt) ?? matches[0];
  }

  const totalAsked = pledges.reduce((sum, p) => sum + (p.askAmount ?? 0), 0);
  const totalPledged = pledges.reduce((sum, p) => sum + (p.pledgeAmount ?? 0), 0);
  const receivedCount = pledges.filter((p) => p.status === "DONATED").length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">Personal Solicitations</h2>
            <p className="text-sm text-gray-500">
              {pledges.length} on the list · {formatCurrency(totalAsked)} asked · {formatCurrency(totalPledged)} pledged · {receivedCount} received
            </p>
          </div>
          <div className="flex items-center gap-3">
            {solicitorsInUse.length > 0 && (
              <select
                value={solicitorFilter}
                onChange={(e) => setSolicitorFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All solicitors</option>
                {solicitorsInUse.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
            >
              + Add Solicitation
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">
            {pledges.length === 0
              ? "No personal solicitations yet. Add people or organizations the committee will ask directly."
              : "No pledges match this filter."}
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-max text-sm mt-3">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-indigo-900">Name</th>
                <th className="text-left px-3 py-2 font-semibold text-indigo-900">Solicitor</th>
                <th className="text-left px-3 py-2 font-semibold text-indigo-900">Status</th>
                <th className="text-right px-3 py-2 font-semibold text-indigo-900">Ask</th>
                <th className="text-right px-3 py-2 font-semibold text-indigo-900">Pledge</th>
                <th className="text-center px-3 py-2 font-semibold text-indigo-900" title="Pledge Acknowledgment Letter">PAL</th>
                <th className="text-center px-3 py-2 font-semibold text-indigo-900" title="Contribution Acknowledgment Letter">CAL</th>
                <th className="text-center px-3 py-2 font-semibold text-indigo-900" title="Network for Good">NFG</th>
                <th className="text-center px-3 py-2 font-semibold text-indigo-900">Logo</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((pledge) => (
                <PledgeRow
                  key={pledge.id}
                  fundraiserId={fundraiserId}
                  pledge={pledge}
                  expanded={expandedId === pledge.id}
                  onToggle={() => setExpandedId(expandedId === pledge.id ? null : pledge.id)}
                  solicitorOptions={solicitorOptions}
                  sponsorshipLevels={sponsorshipLevels}
                  cal={calForPledge(pledge)}
                  onRefresh={onRefresh}
                />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddPledgeModal
          fundraiserId={fundraiserId}
          solicitorTagId={solicitorTagId}
          sponsorshipLevels={sponsorshipLevels}
          existingPeopleIds={existingPeopleIds}
          existingPartnerIds={existingPartnerIds}
          onClose={() => setShowAdd(false)}
          onAdded={onRefresh}
        />
      )}
    </div>
  );
}

function LetterCell({ writtenAt, sentAt }: { writtenAt: string | null; sentAt: string | null }) {
  if (sentAt) {
    return <span className="text-green-700 text-xs font-medium" title={`Sent ${formatDateShort(sentAt)}`}>Sent {formatDateShort(sentAt)}</span>;
  }
  if (writtenAt) {
    return <span className="text-yellow-700 text-xs font-medium" title={`Written ${formatDateShort(writtenAt)}`}>Written</span>;
  }
  return <span className="text-gray-300 text-xs">—</span>;
}

function PledgeRow({
  fundraiserId,
  pledge,
  expanded,
  onToggle,
  solicitorOptions,
  sponsorshipLevels,
  cal,
  onRefresh,
}: {
  fundraiserId: string;
  pledge: Pledge;
  expanded: boolean;
  onToggle: () => void;
  solicitorOptions: PersonOption[];
  sponsorshipLevels: LevelOption[];
  cal: DonationCalInfo | null;
  onRefresh: () => void;
}) {
  const displayName = pledge.partner
    ? pledge.partner.organizationName ?? "—"
    : pledge.person
    ? `${pledge.person.lastName}, ${pledge.person.firstName}`
    : "—";

  const nameLink = pledge.partner
    ? `/partners/${pledge.partner.id}`
    : pledge.person
    ? `/people/${pledge.person.id}`
    : null;

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-3 py-2">
          {nameLink ? (
            <Link href={nameLink} className="text-indigo-600 hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
              {displayName}
            </Link>
          ) : (
            <span className="font-medium">{displayName}</span>
          )}
          {pledge.partner && <span className="ml-1.5 text-xs text-gray-400">org</span>}
          {(pledge.partner?.listedAs ?? pledge.person?.listedAs) && (
            <div className="text-xs text-gray-400">
              Listed as: {pledge.partner?.listedAs ?? pledge.person?.listedAs}
            </div>
          )}
        </td>
        <td className="px-3 py-2 text-gray-600">
          {pledge.solicitor ? `${pledge.solicitor.firstName} ${pledge.solicitor.lastName}` : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-3 py-2">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pledge.status] ?? "bg-gray-100 text-gray-600"}`}>
            {STATUS_LABELS[pledge.status] ?? pledge.status}
          </span>
        </td>
        <td className="px-3 py-2 text-right">
          {pledge.askAmount != null || pledge.sponsorshipLevel ? (
            <div>
              {pledge.askAmount != null && (
                <span className="text-gray-600">{formatCurrency(pledge.askAmount)}</span>
              )}
              {pledge.sponsorshipLevel && (
                <div className="text-xs text-gray-400">{pledge.sponsorshipLevel.name}</div>
              )}
            </div>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-right">
          {pledge.pledgeAmount != null ? (
            <div>
              <span className="font-medium">{formatCurrency(pledge.pledgeAmount)}</span>
              {pledge.pledgeDate && <div className="text-xs text-gray-400">{formatDateShort(pledge.pledgeDate)}</div>}
            </div>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-center"><LetterCell writtenAt={pledge.palWrittenAt} sentAt={pledge.palSentAt} /></td>
        <td className="px-3 py-2 text-center"><LetterCell writtenAt={cal?.calWrittenAt ?? null} sentAt={cal?.calSentAt ?? null} /></td>
        <td className="px-3 py-2 text-center">
          {pledge.nfgEntered && pledge.nfgUpdated ? (
            <span className="text-green-700 text-xs font-medium">✓✓</span>
          ) : pledge.nfgEntered ? (
            <span className="text-yellow-700 text-xs font-medium" title="Entered, not updated">✓</span>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-center">
          {pledge.partner?.logoUrl ? (
            <Image src={pledge.partner.logoUrl} alt="Sponsor logo" width={32} height={32} className="inline-block h-8 w-8 object-contain" unoptimized />
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
        </td>
        <td className="px-2 py-2 text-gray-400 text-xs text-center">{expanded ? "▲" : "▼"}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={10} className="bg-gray-50 px-4 py-4">
            <PledgeEditor
              fundraiserId={fundraiserId}
              pledge={pledge}
              solicitorOptions={solicitorOptions}
              sponsorshipLevels={sponsorshipLevels}
              cal={cal}
              onSaved={onRefresh}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function PledgeEditor({
  fundraiserId,
  pledge,
  solicitorOptions,
  sponsorshipLevels,
  cal,
  onSaved,
}: {
  fundraiserId: string;
  pledge: Pledge;
  solicitorOptions: PersonOption[];
  sponsorshipLevels: LevelOption[];
  cal: DonationCalInfo | null;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(pledge.status);
  const [solicitorId, setSolicitorId] = useState(pledge.solicitor?.id ?? "");
  const [levelId, setLevelId] = useState(pledge.sponsorshipLevel?.id ?? "");
  const [askAmount, setAskAmount] = useState(
    pledge.askAmount != null ? String(centsToDollars(pledge.askAmount)) : ""
  );
  const [pledgeAmount, setPledgeAmount] = useState(
    pledge.pledgeAmount != null ? String(centsToDollars(pledge.pledgeAmount)) : ""
  );
  const [pledgeDate, setPledgeDate] = useState(toDateInput(pledge.pledgeDate));
  const [palWrittenAt, setPalWrittenAt] = useState(toDateInput(pledge.palWrittenAt));
  const [palSentAt, setPalSentAt] = useState(toDateInput(pledge.palSentAt));
  const [nfgEntered, setNfgEntered] = useState(pledge.nfgEntered);
  const [nfgUpdated, setNfgUpdated] = useState(pledge.nfgUpdated);
  const [formInDrive, setFormInDrive] = useState(pledge.formInDrive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = useCallback(async () => {
    setSaving(true);
    setError("");
    const askNumber = parseFloat(askAmount);
    const amountNumber = parseFloat(pledgeAmount);
    const res = await fetch(`/api/fundraisers/${fundraiserId}/solicitations/${pledge.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        solicitorId: solicitorId || null,
        sponsorshipLevelId: levelId || null,
        askAmount: askAmount && !isNaN(askNumber) ? dollarsToCents(askNumber) : null,
        pledgeAmount: pledgeAmount && !isNaN(amountNumber) ? dollarsToCents(amountNumber) : null,
        pledgeDate: pledgeDate || null,
        palWrittenAt: palWrittenAt || null,
        palSentAt: palSentAt || null,
        nfgEntered,
        nfgUpdated,
        formInDrive,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to save");
      return;
    }
    onSaved();
  }, [fundraiserId, pledge.id, status, solicitorId, levelId, askAmount, pledgeAmount, pledgeDate, palWrittenAt, palSentAt, nfgEntered, nfgUpdated, formInDrive, onSaved]);

  async function remove() {
    if (!confirm("Remove this pledge from the list? This cannot be undone.")) return;
    await fetch(`/api/fundraisers/${fundraiserId}/solicitations/${pledge.id}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div className="space-y-4 text-sm" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Solicitor</label>
          <select value={solicitorId} onChange={(e) => setSolicitorId(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm">
            <option value="">— None —</option>
            {solicitorOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.lastName}, {p.firstName}</option>
            ))}
            {pledge.solicitor && !solicitorOptions.some((p) => p.id === pledge.solicitor!.id) && (
              <option value={pledge.solicitor.id}>
                {pledge.solicitor.lastName}, {pledge.solicitor.firstName}
              </option>
            )}
          </select>
          {solicitorOptions.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              No solicitors found — tag people as solicitors, or set a Solicitor Tag in Settings.
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sponsorship Level Ask</label>
          <select
            value={levelId}
            onChange={(e) => {
              setLevelId(e.target.value);
              const level = sponsorshipLevels.find((l) => l.id === e.target.value);
              if (level) setAskAmount(String(centsToDollars(level.amount)));
            }}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">— None —</option>
            {sponsorshipLevels.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({formatCurrency(l.amount)})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ask Amount ($)</label>
          <input type="number" min="0" step="0.01" value={askAmount} onChange={(e) => setAskAmount(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Pledge Amount ($)</label>
          <input type="number" min="0" step="0.01" value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Pledge Date</label>
          <input type="date" value={pledgeDate} onChange={(e) => setPledgeDate(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">PAL Written</label>
          <input type="date" value={palWrittenAt} onChange={(e) => setPalWrittenAt(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">PAL Sent</label>
          <input type="date" value={palSentAt} onChange={(e) => setPalSentAt(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">CAL (tracked on the donation)</label>
          <p className="text-sm text-gray-600 py-1.5">
            {cal && (cal.calWrittenAt || cal.calSentAt) ? (
              <>
                Written {cal.calWrittenAt ? formatDateShort(cal.calWrittenAt) : "—"} · Sent {cal.calSentAt ? formatDateShort(cal.calSentAt) : "—"}
              </>
            ) : (
              <span className="text-gray-400">No donation acknowledgment yet — edit on the Donations tab once their gift is entered.</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-end gap-5 pb-1.5">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={nfgEntered} onChange={(e) => setNfgEntered(e.target.checked)} className="rounded accent-indigo-600" />
            <span className="text-xs font-medium text-gray-600">In NFG</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={nfgUpdated} onChange={(e) => setNfgUpdated(e.target.checked)} className="rounded accent-indigo-600" />
            <span className="text-xs font-medium text-gray-600">NFG Updated</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={formInDrive} onChange={(e) => setFormInDrive(e.target.checked)} className="rounded accent-indigo-600" />
            <span className="text-xs font-medium text-gray-600">Form in Drive</span>
          </label>
        </div>
      </div>

      <SolicitationNotesLog
        fundraiserId={fundraiserId}
        solicitationId={pledge.id}
        notes={pledge.solicitationNotes}
        onChanged={onSaved}
      />

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div className="flex items-center justify-between">
        <button onClick={remove} className="text-xs text-red-500 hover:text-red-700 underline">
          Remove from list
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function SolicitationNotesLog({
  fundraiserId,
  solicitationId,
  notes,
  onChanged,
}: {
  fundraiserId: string;
  solicitationId: string;
  notes: SolicitationNoteEntry[];
  onChanged: () => void;
}) {
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addNote() {
    if (!newNote.trim() || adding) return;
    setAdding(true);
    const res = await fetch(`/api/fundraisers/${fundraiserId}/solicitations/${solicitationId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote.trim() }),
    });
    setAdding(false);
    if (res.ok) {
      setNewNote("");
      onChanged();
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    setDeletingId(noteId);
    await fetch(`/api/fundraisers/${fundraiserId}/solicitations/${solicitationId}/notes/${noteId}`, {
      method: "DELETE",
    });
    setDeletingId(null);
    onChanged();
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNote(); } }}
          placeholder="Add a note — date and your name are recorded automatically"
          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
        />
        <button
          onClick={addNote}
          disabled={adding || !newNote.trim()}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add Note"}
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="text-xs text-gray-400">No notes yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {notes.map((n) => (
            <li key={n.id} className="text-sm bg-white border border-gray-200 rounded-md px-3 py-1.5 flex items-start justify-between gap-3">
              <div>
                <span className="text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  {n.author ? ` — ${n.author.firstName} ${n.author.lastName}` : ""}:
                </span>{" "}
                <span className="text-gray-800">{n.content}</span>
              </div>
              <button
                onClick={() => deleteNote(n.id)}
                disabled={deletingId === n.id}
                className="text-gray-300 hover:text-red-500 text-xs shrink-0 mt-0.5"
                aria-label="Delete note"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
