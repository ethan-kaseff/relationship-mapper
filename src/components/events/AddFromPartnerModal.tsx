"use client";

import { useState, useEffect } from "react";

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

interface AddFromPartnerModalProps {
  eventId: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddFromPartnerModal({ eventId, onClose, onAdded }: AddFromPartnerModalProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    }
  }

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  async function handleAdd() {
    if (!selectedPartnerId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/invites/from-partner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: selectedPartnerId,
          roleIds: selectedRoles.size > 0 ? Array.from(selectedRoles) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to add invites");
        setSubmitting(false);
        return;
      }
      const result = await res.json();
      if (result.created === 0 && result.skipped > 0) {
        setError(`All ${result.skipped} people are already invited to this event.`);
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

        <div className="p-4 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedPartnerId || submitting}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
          >
            {submitting ? "Adding..." : `Invite ${inviteCount} ${inviteCount === 1 ? "Person" : "People"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
