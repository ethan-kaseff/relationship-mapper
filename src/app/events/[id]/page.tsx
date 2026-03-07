"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import InviteManager from "@/components/events/InviteManager";
import SeatingChartWrapper from "@/components/events/SeatingChartWrapper";

interface EventInvite {
  id: string;
  peopleId: string;
  rsvpStatus: string;
  rsvpDate: string | null;
  meal: string;
  dietary: string[];
  notes: string | null;
  group: string;
  tableId: string | null;
  seatIndex: number | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface EventData {
  id: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  seatingLayout: unknown;
  invites: EventInvite[];
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const initialTab = searchParams.get("tab") as "details" | "invites" | "seating" | null;
  const [activeTab, setActiveTab] = useState<"details" | "invites" | "seating">(initialTab || "details");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", eventDate: "", eventTime: "", location: "" });
  const [saving, setSaving] = useState(false);

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/events/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
      setForm({
        title: data.title || "",
        description: data.description || "",
        eventDate: data.eventDate ? data.eventDate.split("T")[0] : "",
        eventTime: data.eventTime || "",
        location: data.location || "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
      }),
    });
    if (res.ok) {
      await fetchEvent();
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this event and all its invites? This cannot be undone.")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/events");
  }

  if (loading) return <div className="text-gray-500 py-8 text-center">Loading...</div>;
  if (!event) return <div className="text-red-500 py-8 text-center">Event not found.</div>;

  const rsvpCounts = {
    YES: event.invites.filter((i) => i.rsvpStatus === "YES").length,
    NO: event.invites.filter((i) => i.rsvpStatus === "NO").length,
    MAYBE: event.invites.filter((i) => i.rsvpStatus === "MAYBE").length,
    PENDING: event.invites.filter((i) => i.rsvpStatus === "PENDING").length,
  };

  const tabs = [
    { id: "details" as const, label: "Details" },
    { id: "invites" as const, label: "Invites", count: event.invites.length },
    { id: "seating" as const, label: "Seating Chart", count: rsvpCounts.YES },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/events" className="text-indigo-600 hover:underline text-sm">
            &larr; Back to Events
          </Link>
          <h1 className="text-2xl font-bold text-indigo-900 mt-1">{event.title}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50"
          >
            Delete Event
          </button>
        </div>
      </div>

      {/* RSVP Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{rsvpCounts.YES}</div>
          <div className="text-xs text-green-600">Yes</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{rsvpCounts.NO}</div>
          <div className="text-xs text-red-600">No</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700">{rsvpCounts.MAYBE}</div>
          <div className="text-xs text-yellow-600">Maybe</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-700">{rsvpCounts.PENDING}</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "details" && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={form.eventTime}
                    onChange={(e) => setForm((f) => ({ ...f, eventTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
                <button
                  onClick={() => setEditing(true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
              <dl className="space-y-3">
                {event.eventDate && (
                  <div>
                    <dt className="text-sm text-gray-500">Date</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(event.eventDate).toLocaleDateString()}
                      {event.eventTime && ` at ${event.eventTime}`}
                    </dd>
                  </div>
                )}
                {event.location && (
                  <div>
                    <dt className="text-sm text-gray-500">Location</dt>
                    <dd className="text-sm text-gray-900">{event.location}</dd>
                  </div>
                )}
                {event.description && (
                  <div>
                    <dt className="text-sm text-gray-500">Description</dt>
                    <dd className="text-sm text-gray-900 whitespace-pre-wrap">{event.description}</dd>
                  </div>
                )}
                {!event.eventDate && !event.location && !event.description && (
                  <p className="text-sm text-gray-400">No details added yet. Click Edit to add them.</p>
                )}
              </dl>
            </div>
          )}
        </div>
      )}

      {activeTab === "invites" && (
        <InviteManager
          eventId={event.id}
          invites={event.invites}
          onRefresh={fetchEvent}
        />
      )}

      {activeTab === "seating" && (
        <SeatingChartWrapper
          event={event}
          onRefresh={fetchEvent}
        />
      )}
    </div>
  );
}
