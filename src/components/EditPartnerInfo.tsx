"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PartnerAnnualInviteToggle from "@/components/PartnerAnnualInviteToggle";

interface OrgType {
  id: string;
  typeName: string;
}

interface AnnualEventType {
  id: string;
  name: string;
}

interface PartnerData {
  orgPeopleFlag: string;
  organizationName: string | null;
  organizationTypeId: string | null;
  organizationType: { typeName: string } | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  priority: number | null;
}

interface Props {
  partnerId: string;
  partner: PartnerData;
  annualEventTypeIds?: string[];
  allAnnualEventTypes?: AnnualEventType[];
}

const PRIORITY_LABELS = ["Highest", "High", "Medium", "Low", "Lowest"];

export default function EditPartnerInfo({ partnerId, partner, annualEventTypeIds, allAnnualEventTypes }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    organizationName: partner.organizationName ?? "",
    organizationTypeId: partner.organizationTypeId ?? "",
    address: partner.address ?? "",
    city: partner.city ?? "",
    state: partner.state ?? "",
    zip: partner.zip ?? "",
    phoneNumber: partner.phoneNumber ?? "",
    email: partner.email ?? "",
    website: partner.website ?? "",
    priority: partner.priority?.toString() ?? "",
  });
  const [orgTypes, setOrgTypes] = useState<OrgType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      fetch("/api/lookup/organization-types")
        .then((res) => res.json())
        .then((data) => setOrgTypes(data))
        .catch(() => {});
    }
  }, [editing]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm({
      organizationName: partner.organizationName ?? "",
      organizationTypeId: partner.organizationTypeId ?? "",
      address: partner.address ?? "",
      city: partner.city ?? "",
      state: partner.state ?? "",
      zip: partner.zip ?? "",
      phoneNumber: partner.phoneNumber ?? "",
      email: partner.email ?? "",
      website: partner.website ?? "",
      priority: partner.priority?.toString() ?? "",
    });
    setEditing(false);
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/partners/${partnerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgPeopleFlag: partner.orgPeopleFlag,
          organizationName: form.organizationName || null,
          organizationTypeId: form.organizationTypeId || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          phoneNumber: form.phoneNumber || null,
          email: form.email || null,
          website: form.website || null,
          priority: form.priority ? parseInt(form.priority) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update partner");
      }

      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  const isOrg = partner.orgPeopleFlag === "O";

  if (!editing) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Partner Information</h2>
          <button
            onClick={() => setEditing(true)}
            className="text-indigo-600 hover:underline text-sm"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-500">Type:</span>{" "}
            <span
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                isOrg ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"
              }`}
            >
              {isOrg ? "Organization" : "Person"}
            </span>
          </div>
          {isOrg && (
            <div>
              <span className="font-medium text-gray-500">Organization Type:</span>{" "}
              <span className="text-gray-800">{partner.organizationType?.typeName ?? "—"}</span>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-500">Address:</span>{" "}
            <span className="text-gray-800">{partner.address ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">City:</span>{" "}
            <span className="text-gray-800">{partner.city ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">State:</span>{" "}
            <span className="text-gray-800">{partner.state ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Zip:</span>{" "}
            <span className="text-gray-800">{partner.zip ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Phone:</span>{" "}
            <span className="text-gray-800">{partner.phoneNumber ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Email:</span>{" "}
            <span className="text-gray-800">{partner.email ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Website:</span>{" "}
            {partner.website ? (
              <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                {partner.website}
              </a>
            ) : (
              <span className="text-gray-800">—</span>
            )}
          </div>
          <div>
            <span className="font-medium text-gray-500">Priority:</span>{" "}
            <span className="text-gray-800">
              {partner.priority ? `${partner.priority} — ${PRIORITY_LABELS[partner.priority - 1]}` : "—"}
            </span>
          </div>
          {annualEventTypeIds !== undefined && allAnnualEventTypes && allAnnualEventTypes.length > 0 && (
            <div>
              <span className="font-medium text-gray-500">Annual Events:</span>{" "}
              <PartnerAnnualInviteToggle partnerId={partnerId} initialTypeIds={annualEventTypeIds} allTypes={allAnnualEventTypes} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-indigo-900">Edit Partner Information</h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isOrg ? "Organization Name" : "Person Name"}
          </label>
          <input
            type="text"
            name="organizationName"
            value={form.organizationName}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {isOrg && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Type</label>
            <select
              name="organizationTypeId"
              value={form.organizationTypeId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">— Select —</option>
              {orgTypes.map((ot) => (
                <option key={ot.id} value={ot.id}>{ot.typeName}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input type="text" name="city" value={form.city} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input type="text" name="state" value={form.state} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
            <input type="text" name="zip" value={form.zip} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="text" name="phoneNumber" value={form.phoneNumber} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input type="text" name="website" value={form.website} onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">— None —</option>
            <option value="1">1 — Highest</option>
            <option value="2">2 — High</option>
            <option value="3">3 — Medium</option>
            <option value="4">4 — Low</option>
            <option value="5">5 — Lowest</option>
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={resetForm}
            className="text-gray-500 hover:text-gray-700 text-sm px-3 py-1.5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
