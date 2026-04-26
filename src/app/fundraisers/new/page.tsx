"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { dollarsToCents } from "@/lib/currency";

interface EventOption {
  id: string;
  title: string;
}

export default function NewFundraiserPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    goalDollars: "",
    slug: "",
    startDate: "",
    endDate: "",
    eventId: "",
  });
  const [presetDollars, setPresetDollars] = useState("25, 50, 100");

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch(() => {});
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const presetAmounts = presetDollars
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s)
        .map((s) => dollarsToCents(parseFloat(s)))
        .filter((n) => !isNaN(n) && n > 0);

      const goalAmount = dollarsToCents(parseFloat(form.goalDollars));
      if (isNaN(goalAmount) || goalAmount <= 0) {
        throw new Error("Goal amount must be greater than $0");
      }

      const res = await fetch("/api/fundraisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          goalAmount,
          presetAmounts: presetAmounts.length > 0 ? presetAmounts : undefined,
          slug: form.slug || autoSlug(form.title),
          startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          eventId: form.eventId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create fundraiser");
      }

      const fundraiser = await res.json();
      router.push(`/fundraisers/${fundraiser.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-indigo-900">New Fundraiser</h1>
        <Link href="/fundraisers" className="text-indigo-600 hover:underline text-sm">
          Back to Fundraisers
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
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              autoFocus
              value={form.title}
              onChange={(e) => {
                handleChange(e);
                if (!slugManuallyEdited) {
                  setForm((prev) => ({ ...prev, slug: autoSlug(e.target.value) }));
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Slug <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">/donate/</span>
              <input
                type="text"
                name="slug"
                required
                value={form.slug}
                onChange={(e) => { setSlugManuallyEdited(true); handleChange(e); }}
                placeholder="my-fundraiser"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="goalDollars"
              required
              min="1"
              step="0.01"
              value={form.goalDollars}
              onChange={handleChange}
              placeholder="10000"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preset Donation Amounts ($)
            </label>
            <input
              type="text"
              value={presetDollars}
              onChange={(e) => setPresetDollars(e.target.value)}
              placeholder="25, 50, 100"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated dollar amounts shown on the public donation page
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {events.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to Event
              </label>
              <select
                name="eventId"
                value={form.eventId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">— None —</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
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
              {submitting ? "Creating..." : "Create Fundraiser"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
