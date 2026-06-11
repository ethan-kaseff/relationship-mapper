"use client";

import { useState, useEffect, useMemo } from "react";
import { dollarsToCents } from "@/lib/currency";

interface PersonOption {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  tags: { tagId: string }[];
}

interface PartnerOption {
  id: string;
  organizationName: string | null;
  status: string;
}

interface TagOption {
  id: string;
  name: string;
}

interface AddPledgeModalProps {
  fundraiserId: string;
  solicitorTagId: string | null;
  existingPeopleIds: string[];
  existingPartnerIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddPledgeModal({
  fundraiserId,
  solicitorTagId,
  existingPeopleIds,
  existingPartnerIds,
  onClose,
  onAdded,
}: AddPledgeModalProps) {
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [whoType, setWhoType] = useState<"person" | "org">("person");
  const [search, setSearch] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [solicitorId, setSolicitorId] = useState("");
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [pledgeDate, setPledgeDate] = useState("");
  const [listedAs, setListedAs] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/people").then((r) => r.json()),
      fetch("/api/partners").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([peopleData, partnersData, tagsData]) => {
      setPeople(
        (Array.isArray(peopleData) ? peopleData : []).filter(
          (p: PersonOption) => p.status === "ACTIVE"
        )
      );
      setPartners(
        (Array.isArray(partnersData) ? partnersData : []).filter(
          (p: PartnerOption) => p.organizationName && p.status === "ACTIVE"
        )
      );
      setTags(Array.isArray(tagsData) ? tagsData : []);
      setLoading(false);
    });
  }, []);

  // Only people with the solicitor tag qualify: the fundraiser's configured
  // tag wins, otherwise a tag named "Solicitor". No tag → empty list.
  const solicitorOptions = useMemo(() => {
    const effectiveTagId =
      solicitorTagId ?? tags.find((t) => t.name.toLowerCase() === "solicitor")?.id ?? null;
    if (!effectiveTagId) return [];
    return people
      .filter((p) => p.tags.some((t) => t.tagId === effectiveTagId))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }, [people, tags, solicitorTagId]);

  const filteredPeople = useMemo(() => {
    const q = search.toLowerCase();
    return people
      .filter((p) => !existingPeopleIds.includes(p.id))
      .filter((p) => !q || `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || `${p.lastName}, ${p.firstName}`.toLowerCase().includes(q))
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      .slice(0, 50);
  }, [people, search, existingPeopleIds]);

  const filteredPartners = useMemo(() => {
    const q = search.toLowerCase();
    return partners
      .filter((p) => !existingPartnerIds.includes(p.id))
      .filter((p) => !q || (p.organizationName ?? "").toLowerCase().includes(q))
      .sort((a, b) => (a.organizationName ?? "").localeCompare(b.organizationName ?? ""))
      .slice(0, 50);
  }, [partners, search, existingPartnerIds]);

  const canSubmit = whoType === "person" ? !!selectedPersonId : !!selectedPartnerId;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");

    const amountNumber = parseFloat(pledgeAmount);
    const body = {
      peopleId: whoType === "person" ? selectedPersonId : null,
      partnerId: whoType === "org" ? selectedPartnerId : null,
      solicitorId: solicitorId || null,
      pledgeAmount: pledgeAmount && !isNaN(amountNumber) ? dollarsToCents(amountNumber) : null,
      pledgeDate: pledgeDate || null,
      listedAs: listedAs.trim() || null,
      notes: notes.trim() || null,
    };

    const res = await fetch(`/api/fundraisers/${fundraiserId}/solicitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to add pledge");
      setSubmitting(false);
      return;
    }

    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Personal Solicitation</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Person or Organization */}
          <div>
            <div className="flex gap-4 mb-2">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={whoType === "person"}
                  onChange={() => { setWhoType("person"); setSelectedPartnerId(""); setSearch(""); }}
                  className="accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">Person</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={whoType === "org"}
                  onChange={() => { setWhoType("org"); setSelectedPersonId(""); setSearch(""); }}
                  className="accent-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">Organization</span>
              </label>
            </div>

            <input
              type="text"
              placeholder={whoType === "person" ? "Search people..." : "Search organizations..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />

            <div className="mt-1 border border-gray-200 rounded-md max-h-44 overflow-y-auto">
              {loading ? (
                <p className="text-gray-500 text-sm text-center py-4">Loading...</p>
              ) : whoType === "person" ? (
                filteredPeople.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No matching people.</p>
                ) : (
                  filteredPeople.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        checked={selectedPersonId === p.id}
                        onChange={() => setSelectedPersonId(p.id)}
                        className="accent-indigo-600"
                      />
                      <span className="text-sm text-gray-900">{p.lastName}, {p.firstName}</span>
                    </label>
                  ))
                )
              ) : filteredPartners.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No matching organizations.</p>
              ) : (
                filteredPartners.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedPartnerId === p.id}
                      onChange={() => setSelectedPartnerId(p.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm text-gray-900">{p.organizationName}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Solicitor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solicitor</label>
            <select
              value={solicitorId}
              onChange={(e) => setSolicitorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">— None yet —</option>
              {solicitorOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.lastName}, {p.firstName}</option>
              ))}
            </select>
            {solicitorOptions.length === 0 ? (
              <p className="text-xs text-amber-600 mt-1">
                No solicitors found. Tag your solicitors with the &quot;Solicitor&quot; tag (or the tag
                chosen in this fundraiser&apos;s Settings tab) and they&apos;ll show up here.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                Showing people with this fundraiser&apos;s solicitor tag.
              </p>
            )}
          </div>

          {/* Pledge amount + date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pledge Amount ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={pledgeAmount}
                onChange={(e) => setPledgeAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pledge Date</label>
              <input
                type="date"
                value={pledgeDate}
                onChange={(e) => setPledgeDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            Leave blank if they haven&apos;t pledged yet — you can fill these in later.
          </p>

          {/* Listed as */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Listed As</label>
            <input
              type="text"
              placeholder='How they should appear publicly, e.g. "The Smith Family"'
              value={listedAs}
              onChange={(e) => setListedAs(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Pledge"}
          </button>
        </div>
      </div>
    </div>
  );
}
