"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";
import OfficeDataToggle from "@/components/OfficeDataToggle";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

export default function AddRoleForm({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [people, setPeople] = useState<Person[]>([]);

  const [roleDescription, setRoleDescription] = useState("");
  const [peopleId, setPeopleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const roleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && roleInputRef.current) {
      roleInputRef.current.focus();
    }
  }, [open]);

  const fetchPeople = useCallback(() => {
    fetch("/api/people")
      .then((res) => res.json())
      .then((data) => setPeople(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) fetchPeople();
  }, [open, fetchPeople]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/partner-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          roleDescription,
          peopleId: peopleId || null,
          startDate: peopleId && startDate ? startDate : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create role");
      }

      setRoleDescription("");
      setPeopleId("");
      setStartDate("");
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
        Add Role
      </button>
    );
  }

  const personOptions = people.map((p) => ({
    value: p.id,
    label: `${p.lastName}, ${p.firstName}`,
  }));

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="font-semibold text-indigo-900 text-sm">Add New Role</h3>
        <OfficeDataToggle onToggle={() => fetchPeople()} />
      </div>
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-2 mb-3 text-xs">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Role Description <span className="text-red-500">*</span>
          </label>
          <input
            ref={roleInputRef}
            type="text"
            required
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            placeholder="e.g. Executive Director"
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="w-56">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Assign Person (optional)
          </label>
          <SearchableSelect
            options={personOptions}
            value={peopleId}
            onChange={setPeopleId}
            placeholder="Search people..."
          />
        </div>
        {peopleId && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Start Date (optional)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
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
