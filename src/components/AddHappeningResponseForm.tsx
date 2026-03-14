"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface Happening {
  id: string;
  happeningDescription: string;
  happeningDate: string;
}

export default function AddHappeningResponseForm({
  personId,
  happeningId,
}: {
  personId?: string;
  happeningId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [people, setPeople] = useState<Person[]>([]);
  const [happenings, setHappenings] = useState<Happening[]>([]);

  const [selectedPersonId, setSelectedPersonId] = useState(personId ?? "");
  const [selectedHappeningId, setSelectedHappeningId] = useState(happeningId ?? "");
  const [responseDate, setResponseDate] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [responseNotes, setResponseNotes] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [platform, setPlatform] = useState("");
  const [platformLink, setPlatformLink] = useState("");

  const fetchData = useCallback(() => {
    if (happeningId) {
      // On happening detail page — need to pick a person
      fetch("/api/people")
        .then((res) => res.json())
        .then((data) => setPeople(data))
        .catch(() => {});
    }
    if (personId) {
      // On people detail page — need to pick a happening
      fetch("/api/happenings")
        .then((res) => res.json())
        .then((data) => setHappenings(data))
        .catch(() => {});
    }
  }, [happeningId, personId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/happening-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peopleId: selectedPersonId,
          happeningId: selectedHappeningId,
          responseDate: responseDate || null,
          responseTime: responseTime || null,
          responseNotes: responseNotes || null,
          isPublic,
          platform: isPublic && platform ? platform : null,
          platformLink: isPublic && platformLink ? platformLink : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create response");
      }

      // Reset form
      if (!personId) setSelectedPersonId("");
      if (!happeningId) setSelectedHappeningId("");
      setResponseDate("");
      setResponseTime("");
      setResponseNotes("");
      setIsPublic(true);
      setPlatform("");
      setPlatformLink("");
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
        Add Response
      </button>
    );
  }

  const personOptions = people.map((p) => ({
    value: p.id,
    label: `${p.lastName}, ${p.firstName}`,
  }));

  const happeningOptions = happenings.map((h) => ({
    value: h.id,
    label: h.happeningDescription,
  }));

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-gray-50 mt-4">
      <h3 className="font-semibold text-indigo-900 text-sm mb-3">Add New Response</h3>
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-2 mb-3 text-xs">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {/* Show person picker when on happening detail page */}
        {happeningId && (
          <div className="w-64">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Person <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={personOptions}
              value={selectedPersonId}
              onChange={setSelectedPersonId}
              placeholder="Search people..."
              required
              autoFocus
            />
          </div>
        )}

        {/* Show happening picker when on people detail page */}
        {personId && (
          <div className="w-64">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Happening <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={happeningOptions}
              value={selectedHappeningId}
              onChange={setSelectedHappeningId}
              placeholder="Search happenings..."
              required
              autoFocus
            />
          </div>
        )}

        <div className="w-40">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Response Date
          </label>
          <input
            type="date"
            value={responseDate}
            onChange={(e) => setResponseDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="w-32">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Response Time
          </label>
          <input
            type="time"
            value={responseTime}
            onChange={(e) => setResponseTime(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="w-64">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            rows={1}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isPublic" className="text-xs font-medium text-gray-700">
            Public
          </label>
        </div>

        {isPublic && (
          <>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                <option value="Facebook">Facebook</option>
                <option value="Twitter/X">Twitter/X</option>
                <option value="Instagram">Instagram</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
                <option value="Text/SMS">Text/SMS</option>
                <option value="Website">Website</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="w-48">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Link
              </label>
              <input
                type="url"
                value={platformLink}
                onChange={(e) => setPlatformLink(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        <div className="flex gap-2">
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
