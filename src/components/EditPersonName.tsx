"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AnnualEventType {
  id: string;
  name: string;
}

interface PersonData {
  firstName: string;
  middleInitial: string | null;
  lastName: string;
  prefix: string | null;
  greeting: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phoneNumber: string | null;
  personalEmail: string | null;
  isConnector: boolean;
  annualEventTypeIds: string[];
}

interface Props {
  personId: string;
  person: PersonData;
  allAnnualEventTypes: AnnualEventType[];
}

export default function EditPersonButton({ personId, person, allAnnualEventTypes }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...person });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleAetToggle(typeId: string) {
    setForm((prev) => ({
      ...prev,
      annualEventTypeIds: prev.annualEventTypeIds.includes(typeId)
        ? prev.annualEventTypeIds.filter((id) => id !== typeId)
        : [...prev.annualEventTypeIds, typeId],
    }));
  }

  function resetForm() {
    setForm({ ...person });
    setEditing(false);
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/people/${personId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          middleInitial: form.middleInitial || null,
          lastName: form.lastName,
          prefix: form.prefix || null,
          greeting: form.greeting || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          phoneNumber: form.phoneNumber || null,
          personalEmail: form.personalEmail || null,
          isConnector: form.isConnector,
          annualEventTypeIds: form.annualEventTypeIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update person");
      }

      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  // ── Read-only view with Edit button ──
  if (!editing) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-indigo-900">Contact Information</h2>
          <button
            onClick={() => { setForm({ ...person }); setEditing(true); }}
            className="text-indigo-600 hover:underline text-sm"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
          {person.prefix && (
            <div>
              <span className="font-medium text-gray-500">Prefix:</span>{" "}
              <span className="text-gray-800">{person.prefix}</span>
            </div>
          )}
          {person.greeting && (
            <div>
              <span className="font-medium text-gray-500">Greeting:</span>{" "}
              <span className="text-gray-800">{person.greeting}</span>
            </div>
          )}
          {person.phoneNumber && (
            <div>
              <span className="font-medium text-gray-500">Phone:</span>{" "}
              <span className="text-gray-800">{person.phoneNumber}</span>
            </div>
          )}
          {person.personalEmail && (
            <div>
              <span className="font-medium text-gray-500">Email:</span>{" "}
              <span className="text-gray-800">{person.personalEmail}</span>
            </div>
          )}
          {(person.address || person.city || person.state || person.zip) && (
            <div className="md:col-span-2">
              <span className="font-medium text-gray-500">Address:</span>{" "}
              <span className="text-gray-800">
                {[person.address, [person.city, person.state].filter(Boolean).join(", "), person.zip].filter(Boolean).join(" ")}
              </span>
            </div>
          )}
          {person.isConnector && (
            <div>
              <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                Connector
              </span>
            </div>
          )}
          {person.annualEventTypeIds.length > 0 && (
            <div className="md:col-span-2">
              <span className="font-medium text-gray-500">Annual Events:</span>{" "}
              <span className="text-gray-800">
                {allAnnualEventTypes
                  .filter((t) => person.annualEventTypeIds.includes(t.id))
                  .map((t) => t.name)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Edit form ──
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-indigo-900">Edit Contact Information</h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              required
              value={form.firstName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="w-16">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MI
            </label>
            <input
              type="text"
              name="middleInitial"
              maxLength={5}
              value={form.middleInitial ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              required
              value={form.lastName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Professional Prefix</label>
          <input
            type="text"
            name="prefix"
            placeholder="e.g. Rabbi, Dr, Reverend"
            value={form.prefix ?? ""}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            name="address"
            value={form.address ?? ""}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              name="city"
              value={form.city ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              name="state"
              value={form.state ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
            <input
              type="text"
              name="zip"
              value={form.zip ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              value={form.phoneNumber ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
            <input
              type="email"
              name="personalEmail"
              value={form.personalEmail ?? ""}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Personalized Greeting</label>
          <input
            type="text"
            name="greeting"
            placeholder="e.g. Dear Rabbi Smith"
            value={form.greeting ?? ""}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isConnector"
              id="editIsConnector"
              checked={form.isConnector}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="editIsConnector" className="text-sm font-medium text-gray-700">
              Is Connector
            </label>
          </div>
        </div>

        {allAnnualEventTypes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Event Invites</label>
            <div className="flex flex-wrap gap-3">
              {allAnnualEventTypes.map((type) => (
                <label key={type.id} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.annualEventTypeIds.includes(type.id)}
                    onChange={() => handleAetToggle(type.id)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{type.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
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
