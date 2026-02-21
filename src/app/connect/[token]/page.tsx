"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";

interface PartnerRoleOption {
  id: string;
  label: string;
}

interface ConnectorInfo {
  person: { id: string; firstName: string; lastName: string };
  partnerRoles: PartnerRoleOption[];
}

export default function ConnectPage() {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo] = useState<ConnectorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [partnerRoleId, setPartnerRoleId] = useState("");
  const [connectionDate, setConnectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [connectionTime, setConnectionTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/connect?token=${token}`);
        if (!res.ok) {
          setError("This link is invalid or has been revoked.");
          return;
        }
        const data = await res.json();
        setInfo(data);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          partnerRoleId,
          connectionDate,
          connectionTime: connectionTime || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit interaction.");
        return;
      }

      setSuccess(true);
      setPartnerRoleId("");
      setConnectionDate(new Date().toISOString().split("T")[0]);
      setConnectionTime("");
      setNotes("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-12 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-navy mb-1">
          Hi {info.person.firstName}, log an interaction
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {info.person.firstName} {info.person.lastName}
        </p>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 text-green-800 text-sm">
            Interaction logged successfully!{" "}
            <button
              onClick={() => setSuccess(false)}
              className="underline font-medium"
            >
              Log another
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Person
            </label>
            <SearchableSelect
              options={info.partnerRoles.map((pr) => ({
                value: pr.id,
                label: pr.label,
              }))}
              value={partnerRoleId}
              onChange={setPartnerRoleId}
              placeholder="Search for a person..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={connectionDate}
                onChange={(e) => setConnectionDate(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={connectionTime}
                onChange={(e) => setConnectionTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent"
              placeholder="Optional notes about the interaction..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#2E75B6] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#245d92] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Log Interaction"}
          </button>
        </form>
      </div>
    </div>
  );
}
