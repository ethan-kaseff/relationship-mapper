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
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);

  const [partnerRoleId, setPartnerRoleId] = useState("");
  const [relationshipTypeId, setRelationshipTypeId] = useState("");

  const fetchData = useCallback(() => {
    fetch("/api/partner-roles")
      .then((res) => res.json())
      .then((data) => setPartnerRoles(data))
      .catch(() => {});
    fetch("/api/lookup/relationship-types")
      .then((res) => res.json())
      .then((data) => setRelationshipTypes(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peopleId: personId,
          partnerRoleId,
          relationshipTypeId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create relationship");
      }

      setPartnerRoleId("");
      setRelationshipTypeId("");
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
        className="bg-[#2E75B6] text-white px-4 py-2 rounded-md hover:bg-[#245d91] transition-colors text-sm"
      >
        Add Relationship
      </button>
    );
  }

  // Only show roles that have a person assigned (skip vacant roles)
  const filledRoles = partnerRoles.filter((pr) => pr.person !== null);

  const partnerRoleOptions = filledRoles.map((pr) => ({
    value: pr.id,
    label: `${pr.person!.lastName}, ${pr.person!.firstName} — ${pr.roleDescription} at ${pr.partner.organizationName ?? "Unknown"}`,
  }));

  const relTypeOptions = relationshipTypes.map((rt) => ({
    value: rt.id,
    label: rt.relationshipDesc,
  }));

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mt-4">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="font-semibold text-navy text-sm">Add New Relationship</h3>
        <OfficeDataToggle onToggle={() => fetchData()} />
      </div>
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-2 mb-3 text-xs">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="w-80">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Person <span className="text-red-500">*</span>
          </label>
          <SearchableSelect
            options={partnerRoleOptions}
            value={partnerRoleId}
            onChange={setPartnerRoleId}
            placeholder="Search people..."
            required
            autoFocus
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Relationship Type <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={relationshipTypeId}
            onChange={(e) => setRelationshipTypeId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
          >
            <option value="">— Select —</option>
            {relTypeOptions.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#2E75B6] text-white px-4 py-1.5 rounded-md hover:bg-[#245d91] transition-colors text-sm disabled:opacity-50"
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
