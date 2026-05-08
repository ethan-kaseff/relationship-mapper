"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Office { id: string; name: string; }
interface User { id: string; firstName: string; lastName: string; }
interface EmailTemplate { id: string; name: string; subject: string; body: string; }

export default function NewPersonPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isSystemAdmin = session?.user?.role === "SYSTEM_ADMIN";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [assignedToId, setAssignedToId] = useState("");
  const [emailTemplateId, setEmailTemplateId] = useState("");

  useEffect(() => {
    if (isSystemAdmin) {
      fetch("/api/offices").then((r) => r.json()).then(setOffices).catch(() => {});
    }
  }, [isSystemAdmin]);

  const [form, setForm] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    prefix: "",
    greeting: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phoneNumber: "",
    email1: "",
    email2: "",
    isConnector: false,
    status: "ACTIVE",
  });

  useEffect(() => {
    if (form.status === "PROSPECT" && users.length === 0) {
      fetch("/api/users/assignable").then((r) => r.json()).then(setUsers).catch(() => {});
      fetch("/api/email-templates").then((r) => r.json()).then(setTemplates).catch(() => {});
    }
  }, [form.status, users.length]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const type = (e.target as HTMLInputElement).type;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        ...form,
        ...(isSystemAdmin && selectedOfficeId ? { officeId: selectedOfficeId } : {}),
      };
      if (form.status === "PROSPECT") {
        body.assignedToId = assignedToId || null;
        body.assignedDate = assignedToId ? new Date().toISOString() : null;
        body.emailTemplateId = emailTemplateId || null;
      }

      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create person");
      }

      const person = await res.json();
      router.push(`/people/${person.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === emailTemplateId) ?? null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-indigo-900">Add Person</h1>
        <Link href="/people" className="text-indigo-600 hover:underline text-sm">
          Back to People
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                required
                autoFocus
                value={form.firstName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="w-16">
              <label className="block text-sm font-medium text-gray-700 mb-1">MI</label>
              <input
                type="text"
                name="middleInitial"
                maxLength={5}
                value={form.middleInitial}
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
              value={form.prefix}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            />
          </div>

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
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
              <input
                type="text"
                name="zip"
                value={form.zip}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email 1</label>
              <input
                type="email"
                name="email1"
                value={form.email1}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email 2</label>
              <input
                type="email"
                name="email2"
                value={form.email2}
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
              value={form.greeting}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="ACTIVE">Active</option>
              <option value="PROSPECT">Prospect</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DECEASED">Deceased</option>
            </select>
          </div>

          {form.status === "PROSPECT" && (
            <div className="border border-blue-100 bg-blue-50 rounded-md p-4 space-y-3">
              <p className="text-xs font-medium text-blue-700">Prospect Details</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Template <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={emailTemplateId}
                  onChange={(e) => setEmailTemplateId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— None —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {selectedTemplate && (
                <div className="bg-white rounded-md p-3 text-xs text-gray-600 space-y-1 border border-gray-200">
                  <div className="font-medium text-gray-700">Subject: {selectedTemplate.subject}</div>
                  <div className="whitespace-pre-wrap line-clamp-3">{selectedTemplate.body}</div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isConnector"
              id="isConnector"
              checked={form.isConnector}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="isConnector" className="text-sm font-medium text-gray-700">
              Is Connector
            </label>
          </div>

          {isSystemAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
              <select
                value={selectedOfficeId}
                onChange={(e) => setSelectedOfficeId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Create Person"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
