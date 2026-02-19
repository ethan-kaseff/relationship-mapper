"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchableSelect from "@/components/SearchableSelect";

interface Person {
  id: string;
  fullName: string;
}

interface PartnerRole {
  id: string;
  roleDescription: string;
  partner: { organizationName: string | null };
}

interface RelType {
  id: string;
  relationshipDesc: string;
}

export default function NewRelationshipPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [partnerRoles, setPartnerRoles] = useState<PartnerRole[]>([]);
  const [relTypes, setRelTypes] = useState<RelType[]>([]);

  const [form, setForm] = useState({
    peopleId: "",
    partnerRoleId: "",
    relationshipTypeId: "",
  });

  useEffect(() => {
    fetch("/api/people")
      .then((res) => res.json())
      .then((data) => setPeople(data))
      .catch(() => {});
    fetch("/api/partner-roles")
      .then((res) => res.json())
      .then((data) => setPartnerRoles(data))
      .catch(() => {});
    fetch("/api/lookup/relationship-types")
      .then((res) => res.json())
      .then((data) => setRelTypes(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create relationship");
      }

      router.push("/relationships");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const personOptions = people.map((p) => ({
    value: p.id,
    label: p.fullName,
  }));

  const partnerRoleOptions = partnerRoles.map((pr) => ({
    value: pr.id,
    label: `${pr.partner.organizationName ?? "Unknown"} — ${pr.roleDescription}`,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Add Relationship</h1>
        <Link href="/relationships" className="text-[#2E75B6] hover:underline text-sm">
          Back to Relationships
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Person (Connector) <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={personOptions}
              value={form.peopleId}
              onChange={(val) => setForm((prev) => ({ ...prev, peopleId: val }))}
              placeholder="Search people..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Partner Role <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={partnerRoleOptions}
              value={form.partnerRoleId}
              onChange={(val) => setForm((prev) => ({ ...prev, partnerRoleId: val }))}
              placeholder="Search partner roles..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship Type <span className="text-red-500">*</span>
            </label>
            <select
              name="relationshipTypeId"
              required
              value={form.relationshipTypeId}
              onChange={(e) => setForm((prev) => ({ ...prev, relationshipTypeId: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            >
              <option value="">— Select Type —</option>
              {relTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.relationshipDesc}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#2E75B6] text-white px-6 py-2 rounded-md hover:bg-[#245d91] transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Create Relationship"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
