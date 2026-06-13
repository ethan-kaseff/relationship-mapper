"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";
import OfficeDataToggle from "@/components/OfficeDataToggle";

interface PartnerRole {
  id: string;
  roleDescription: string;
  partner: { organizationName: string | null };
  person: { id: string; firstName: string; lastName: string } | null;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface RelationshipType {
  id: string;
  relationshipDesc: string;
}

export default function AddRelationshipForm({ personId }: { personId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [partnerRoles, setPartnerRoles] = useState<PartnerRole[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);

  const [targetPersonId, setTargetPersonId] = useState("");
  const [partnerRoleId, setPartnerRoleId] = useState("");
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);

  const fetchData = useCallback(() => {
    fetch("/api/partner-roles")
      .then((res) => res.json())
      .then((data) => setPartnerRoles(Array.isArray(data) ? data : []))
      .catch(() => { /* fetch failed */ });
    fetch("/api/people")
      .then((res) => res.json())
      .then((data) => setPeople(Array.isArray(data) ? data : []))
      .catch(() => { /* fetch failed */ });
    fetch("/api/lookup/relationship-types")
      .then((res) => res.json())
      .then((data) => setRelationshipTypes(Array.isArray(data) ? data : []))
      .catch(() => { /* fetch failed */ });
  }, []);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  function toggleType(id: string) {
    setSelectedTypeIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetPersonId) {
      setError("Please choose a person to connect to.");
      return;
    }
    if (selectedTypeIds.length === 0) {
      setError("Please select at least one relationship type.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peopleId: personId,
          targetPersonId,
          partnerRoleId: partnerRoleId || null,
          relationshipTypeIds: selectedTypeIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create relationship");
      }

      setTargetPersonId("");
      setPartnerRoleId("");
      setSelectedTypeIds([]);
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
      >
        Add Relationship
      </button>
    );
  }

  const personOptions = people
    .filter((p) => p.id !== personId)
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
    .map((p) => ({ value: p.id, label: `${p.lastName}, ${p.firstName}` }));

  // Optional org-role context — limited to roles held by the chosen target person
  const roleOptions = partnerRoles
    .filter((pr) => pr.person !== null && (!targetPersonId || pr.person!.id === targetPersonId))
    .map((pr) => ({
      value: pr.id,
      label: `${pr.roleDescription} at ${pr.partner.organizationName ?? "Unknown"}`,
    }));

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mt-4">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="font-semibold text-indigo-900 text-sm">Add New Relationship</h3>
        <OfficeDataToggle onToggle={() => fetchData()} />
      </div>
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-2 mb-3 text-xs">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-start">
        <div className="w-72">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Person <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={personOptions}
            value={targetPersonId}
            onChange={(v) => { setTargetPersonId(v); setPartnerRoleId(""); }}
            placeholder="Search people..."
            required
            autoFocus
          />
        </div>
        <div className="w-64">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Through role <span className="text-gray-400">(optional)</span>
          </label>
          <SearchableSelect
            options={roleOptions}
            value={partnerRoleId}
            onChange={setPartnerRoleId}
            placeholder={roleOptions.length ? "Org role (optional)…" : "No org roles"}
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Relationship Type <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col gap-1">
            {relationshipTypes.map((rt) => (
              <label key={rt.id} className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedTypeIds.includes(rt.id)}
                  onChange={() => toggleType(rt.id)}
                  className="accent-indigo-600 w-3.5 h-3.5"
                />
                <span className="text-sm text-gray-700">{rt.relationshipDesc}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
