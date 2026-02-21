"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface OrgType {
  id: string;
  typeName: string;
}

interface Office {
  id: string;
  name: string;
}

export default function NewPartnerPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isSystemAdmin = session?.user?.role === "SYSTEM_ADMIN";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orgTypes, setOrgTypes] = useState<OrgType[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState("");

  const [form, setForm] = useState({
    orgPeopleFlag: "O",
    organizationName: "",
    organizationTypeId: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phoneNumber: "",
    email: "",
    website: "",
    priority: "",
  });

  useEffect(() => {
    fetch("/api/lookup/organization-types")
      .then((res) => res.json())
      .then((data) => setOrgTypes(data))
      .catch(() => {});
    if (isSystemAdmin) {
      fetch("/api/offices")
        .then((res) => res.json())
        .then((data) => setOffices(data))
        .catch(() => {});
    }
  }, [isSystemAdmin]);

  const isOrg = form.orgPeopleFlag === "O";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "orgPeopleFlag" && value === "P") {
        next.organizationTypeId = "";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          organizationTypeId: form.organizationTypeId || null,
          priority: form.priority ? parseInt(form.priority) : null,
          ...(isSystemAdmin && selectedOfficeId ? { officeId: selectedOfficeId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create partner");
      }

      router.push("/partners");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Add Partner</h1>
        <Link href="/partners" className="text-[#2E75B6] hover:underline text-sm">
          Back to Partners
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
              Org / Person Flag <span className="text-red-500">*</span>
            </label>
            <select
              name="orgPeopleFlag"
              value={form.orgPeopleFlag}
              onChange={handleChange}
              autoFocus
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            >
              <option value="O">Organization</option>
              <option value="P">Person</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isOrg ? "Organization Name" : "Person Name"}
            </label>
            <input
              type="text"
              name="organizationName"
              value={form.organizationName}
              onChange={handleChange}
              placeholder={isOrg ? "e.g. Kansas Governor's Office" : "e.g. Jane Smith"}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            />
          </div>

          {isOrg && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Type
              </label>
              <select
                name="organizationTypeId"
                value={form.organizationTypeId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              >
                <option value="">— Select —</option>
                {orgTypes.map((ot) => (
                  <option key={ot.id} value={ot.id}>
                    {ot.typeName}
                  </option>
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
              <input
                type="text"
                name="zip"
                value={form.zip}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            >
              <option value="">— None —</option>
              <option value="1">1 — Highest</option>
              <option value="2">2 — High</option>
              <option value="3">3 — Medium</option>
              <option value="4">4 — Low</option>
              <option value="5">5 — Lowest</option>
            </select>
          </div>

          {isSystemAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Office
              </label>
              <select
                value={selectedOfficeId}
                onChange={(e) => setSelectedOfficeId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              >
                <option value="">— Default (your office) —</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#2E75B6] text-white px-6 py-2 rounded-md hover:bg-[#245d91] transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Create Partner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
