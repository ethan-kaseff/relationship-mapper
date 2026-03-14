"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ResponseData {
  id: string;
  responseDate: string | null;
  responseTime: string | null;
  responseNotes: string | null;
  isPublic: boolean;
  platform: string | null;
  platformLink: string | null;
  person?: { id: string; firstName: string; lastName: string };
  happening?: { id: string; happeningDescription: string; happeningDate: string };
}

interface Props {
  response: ResponseData;
  mode: "happening" | "person";
}

export default function HappeningResponseRow({ response, mode }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    responseDate: response.responseDate
      ? new Date(response.responseDate).toISOString().split("T")[0]
      : "",
    responseTime: response.responseTime ?? "",
    responseNotes: response.responseNotes ?? "",
    isPublic: response.isPublic,
    platform: response.platform ?? "",
    platformLink: response.platformLink ?? "",
  });

  function resetForm() {
    setForm({
      responseDate: response.responseDate
        ? new Date(response.responseDate).toISOString().split("T")[0]
        : "",
      responseTime: response.responseTime ?? "",
      responseNotes: response.responseNotes ?? "",
      isPublic: response.isPublic,
      platform: response.platform ?? "",
      platformLink: response.platformLink ?? "",
    });
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/happening-responses/${response.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseDate: form.responseDate || null,
          responseTime: form.responseTime || null,
          responseNotes: form.responseNotes || null,
          isPublic: form.isPublic,
          platform: form.isPublic && form.platform ? form.platform : null,
          platformLink: form.isPublic && form.platformLink ? form.platformLink : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update response");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      alert("Failed to update response");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/happening-responses/${response.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete response");
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to delete response");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  // ── Edit mode ──
  if (editing) {
    return (
      <tr className="bg-indigo-50/40">
        <td className="px-4 py-2">
          {mode === "happening" && response.person ? (
            <Link
              href={`/people/${response.person.id}`}
              className="text-indigo-600 hover:underline"
            >
              {response.person.firstName} {response.person.lastName}
            </Link>
          ) : response.happening ? (
            <>
              <Link
                href={`/happenings/${response.happening.id}`}
                className="text-indigo-600 hover:underline"
              >
                {response.happening.happeningDescription}
              </Link>
              <span className="text-gray-500 ml-2 text-xs">
                {new Date(response.happening.happeningDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
              </span>
            </>
          ) : (
            "—"
          )}
        </td>
        <td className="px-4 py-2">
          <input
            type="date"
            value={form.responseDate}
            onChange={(e) => setForm((f) => ({ ...f, responseDate: e.target.value }))}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </td>
        <td className="px-4 py-2">
          <textarea
            value={form.responseNotes}
            onChange={(e) => setForm((f) => ({ ...f, responseNotes: e.target.value }))}
            rows={2}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </td>
        <td className="px-4 py-2">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-600">Public</span>
          </label>
          {form.isPublic && (
            <div className="mt-2 space-y-1.5">
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Platform...</option>
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
              <input
                type="url"
                value={form.platformLink}
                onChange={(e) => setForm((f) => ({ ...f, platformLink: e.target.value }))}
                placeholder="Link..."
                className="border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // ── Display mode ──
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2">
        {mode === "happening" && response.person ? (
          <Link
            href={`/people/${response.person.id}`}
            className="text-indigo-600 hover:underline"
          >
            {response.person.firstName} {response.person.lastName}
          </Link>
        ) : response.happening ? (
          <>
            <Link
              href={`/happenings/${response.happening.id}`}
              className="text-indigo-600 hover:underline"
            >
              {response.happening.happeningDescription}
            </Link>
            <span className="text-gray-500 ml-2 text-xs">
              {new Date(response.happening.happeningDate).toLocaleDateString(undefined, { timeZone: "UTC" })}
            </span>
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-2 text-gray-600">
        {response.responseDate
          ? new Date(response.responseDate).toLocaleDateString(undefined, { timeZone: "UTC" })
          : "—"}
      </td>
      <td className="px-4 py-2 text-gray-600">{response.responseNotes ?? "—"}</td>
      <td className="px-4 py-2">
        {response.isPublic ? (
          <span className="inline-flex items-center gap-1.5 flex-wrap">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
              Public
            </span>
            {response.platform && (
              <span className="text-xs text-gray-600">
                {response.platformLink ? (
                  <a href={response.platformLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                    {response.platform}
                  </a>
                ) : (
                  response.platform
                )}
              </span>
            )}
          </span>
        ) : (
          <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            Private
          </span>
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setForm({
              responseDate: response.responseDate
                ? new Date(response.responseDate).toISOString().split("T")[0]
                : "",
              responseTime: response.responseTime ?? "",
              responseNotes: response.responseNotes ?? "",
              isPublic: response.isPublic,
              platform: response.platform ?? "",
              platformLink: response.platformLink ?? "",
            }); setEditing(true); }}
            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
          >
            Edit
          </button>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="text-red-600 hover:text-red-800 text-xs font-medium"
            >
              Delete
            </button>
          ) : (
            <span className="inline-flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-2 py-0.5 rounded text-xs hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "..." : "Confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-gray-500 hover:text-gray-700 text-xs"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
