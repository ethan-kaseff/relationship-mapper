"use client";

import { useState, useEffect } from "react";
import InviteOptionsPanel from "./InviteOptionsPanel";

interface DietaryOptionRecord { id: string; name: string; }

interface PartnerRole {
  id: string;
  roleDescription: string;
  peopleId: string | null;
  person: { id: string; firstName: string; lastName: string } | null;
}

interface Partner {
  id: string;
  organizationName: string | null;
  partnerRoles: PartnerRole[];
}

interface ConflictPerson { firstName: string; lastName: string; }

interface SponsorshipLevel {
  id: string;
  name: string;
  amount: number;
  seats: number | null;
}

interface AddFromPartnerModalProps {
  eventId: string;
  existingPeopleIds: string[];
  groups: string[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddFromPartnerModal({ eventId, existingPeopleIds, groups, onClose, onAdded }: AddFromPartnerModalProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<ConflictPerson[] | null>(null);
  const [sponsoredSeats, setSponsoredSeats] = useState<number | "">("");
  const [seatsUsing, setSeatsUsing] = useState<number | "">("");
  const [rsvpStatus, setRsvpStatus] = useState("YES");
  const [meal, setMeal] = useState("Standard");
  const [dietary, setDietary] = useState<string[]>([]);
  const [ticketType, setTicketType] = useState("Regular");
  const [seatingRequest, setSeatingRequest] = useState("");
  const [tableRequest, setTableRequest] = useState("");
  const [customDietary, setCustomDietary] = useState<DietaryOptionRecord[]>([]);
  const [sponsorshipLevels, setSponsorshipLevels] = useState<SponsorshipLevel[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState("");

  useEffect(() => {
    fetch("/api/lookup/dietary-options").then((r) => r.json()).then((d) => setCustomDietary(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/events/${eventId}/sponsorship-levels`).then((r) => r.json()).then((d) => setSponsorshipLevels(Array.isArray(d) ? d : [])).catch(() => {});
  }, [eventId]);

  useEffect(() => {
    fetch("/api/partners?includeRoles=true")
      .then((r) => r.json())
      .then((data) => {
        setPartners(
          data
            .filter((p: Partner) => p.partnerRoles.some((r) => r.peopleId))
            .sort((a: Partner, b: Partner) =>
              (a.organizationName || "").localeCompare(b.organizationName || "")
            )
        );
        setLoading(false);
      });
  }, []);

  function togglePartner(partnerId: string) {
    if (expandedPartner === partnerId) {
      setExpandedPartner(null);
    } else {
      setExpandedPartner(partnerId);
      setSelectedPartnerId(partnerId);
      setSelectedRoles(new Set());
      setSponsoredSeats("");
      setSeatsUsing("");
      setSelectedLevelId("");
      setConflicts(null);
      setError("");
    }
  }

  function toggleRole(roleId: string) {
    setConflicts(null);
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  function handleInviteClick() {
    if (!selectedPartnerId) return;
    const partner = partners.find((p) => p.id === selectedPartnerId);
    const eligibleRoles = partner?.partnerRoles.filter((r) => r.peopleId && r.person) ?? [];
    const activeRoles = selectedRoles.size > 0
      ? eligibleRoles.filter((r) => selectedRoles.has(r.id))
      : eligibleRoles;

    const alreadyInvited = activeRoles.filter((r) => existingPeopleIds.includes(r.peopleId!));
    if (alreadyInvited.length > 0) {
      setConflicts(alreadyInvited.map((r) => ({ firstName: r.person!.firstName, lastName: r.person!.lastName })));
      return;
    }
    handleAdd();
  }

  async function handleAdd() {
    if (!selectedPartnerId) return;
    setConflicts(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/invites/from-partner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: selectedPartnerId,
          roleIds: selectedRoles.size > 0 ? Array.from(selectedRoles) : undefined,
          rsvpStatus, meal, dietary, ticketType,
          seatingRequest: seatingRequest.trim() || null,
          tableRequest: tableRequest.trim() || null,
          ...(sponsoredSeats !== "" ? { sponsoredSeats: Number(sponsoredSeats) } : {}),
          ...(seatsUsing !== "" ? { seatsUsing: Number(seatsUsing) } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to add invites");
        setSubmitting(false);
        return;
      }
      onAdded();
      onClose();
    } catch {
      setError("Failed to add invites");
      setSubmitting(false);
    }
  }

  const filtered = partners.filter((p) => {
    const name = (p.organizationName || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const partner = partners.find((p) => p.id === selectedPartnerId);
  const rolesWithPeople = partner?.partnerRoles.filter((r) => r.peopleId) || [];
  const inviteCount = selectedRoles.size > 0
    ? rolesWithPeople.filter((r) => selectedRoles.has(r.id)).length
    : rolesWithPeople.length;
  const seatsUsingNum = seatsUsing !== "" ? Number(seatsUsing) : 0;
  const placeholderCount = seatsUsingNum > inviteCount ? seatsUsingNum - inviteCount : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Invite from Partner</h2>
          <p className="text-sm text-gray-500 mt-1">Select a partner to invite people linked to their roles.</p>
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-2 mt-2 text-xs">
              {error}
            </div>
          )}
          <input
            type="text"
            placeholder="Search partners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              {partners.length === 0 ? "No partners with linked people found." : "No matching partners."}
            </p>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="border-b border-gray-100">
                <button
                  onClick={() => togglePartner(p.id)}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-left ${
                    expandedPartner === p.id ? "bg-indigo-50" : ""
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {p.organizationName || "Unnamed Partner"}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({p.partnerRoles.filter((r) => r.peopleId).length} people)
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedPartner === p.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedPartner === p.id && (
                  <div className="px-4 pb-3">
                    {p.partnerRoles
                      .filter((r) => r.peopleId && r.person)
                      .map((r) => (
                        <label
                          key={r.id}
                          className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoles.size === 0 || selectedRoles.has(r.id)}
                            onChange={() => toggleRole(r.id)}
                            className="rounded text-indigo-600"
                          />
                          <span className="text-sm text-gray-700">
                            {r.person!.firstName} {r.person!.lastName}
                            <span className="text-gray-400 text-xs ml-1">({r.roleDescription})</span>
                          </span>
                        </label>
                      ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t px-4 pt-3 pb-4 space-y-2.5">
          {conflicts ? (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">
                {conflicts.length === 1
                  ? "This person is already on the invite list:"
                  : "These people are already on the invite list:"}
              </p>
              <ul className="text-sm text-amber-700 space-y-0.5 pl-1">
                {conflicts.map((c, i) => (
                  <li key={i}>{c.lastName}, {c.firstName}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-600">
                {conflicts.length === 1 ? "They" : "They"} will be skipped. Do you want to continue?
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConflicts(null)}
                  className="flex-1 px-3 py-1.5 border border-amber-300 rounded-md text-amber-800 hover:bg-amber-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={submitting}
                  className="flex-1 px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Invite Anyway"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Sponsorship level */}
              {sponsorshipLevels.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 shrink-0">Level</label>
                  <select
                    value={selectedLevelId}
                    onChange={(e) => {
                      const levelId = e.target.value;
                      setSelectedLevelId(levelId);
                      if (levelId) {
                        const level = sponsorshipLevels.find((l) => l.id === levelId);
                        if (level?.seats != null) {
                          setSponsoredSeats(level.seats);
                          setSeatsUsing(level.seats);
                        }
                      }
                    }}
                    className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">No level selected</option>
                    {sponsorshipLevels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — ${(l.amount / 100).toLocaleString()}{l.seats ? ` (${l.seats} seats)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Sponsored seats */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 shrink-0">Sponsored</label>
                  <input
                    type="number"
                    min={1}
                    value={sponsoredSeats}
                    onChange={(e) => setSponsoredSeats(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="e.g. 10"
                    className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600 shrink-0">Using</label>
                  <input
                    type="number"
                    min={1}
                    value={seatsUsing}
                    onChange={(e) => setSeatsUsing(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="e.g. 8"
                    className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                {seatsUsing !== "" && (
                  <span className="text-xs text-gray-500">
                    {inviteCount} named + {placeholderCount} placeholder{placeholderCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
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
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleInviteClick}
                  disabled={!selectedPartnerId || submitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
                >
                  {submitting ? "Adding..." : seatsUsing !== "" && placeholderCount > 0
                    ? `Invite ${inviteCount} + ${placeholderCount} placeholder${placeholderCount !== 1 ? "s" : ""}`
                    : `Invite ${inviteCount} ${inviteCount === 1 ? "Person" : "People"}`
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
