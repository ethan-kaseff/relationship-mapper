"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RelatedData {
  eventInvites: number;
  notes: number;
  roles: number;
  relationships: number;
  connections: number;
  happenings: number;
}

type BlockedState = { kind: "financial"; donations: number } | { kind: "related"; data: RelatedData };

export default function DeletePersonButton({ personId }: { personId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [blocked, setBlocked] = useState<BlockedState | null>(null);

  async function handleDelete(force = false) {
    setDeleting(true);
    try {
      const url = `/api/people/${personId}${force ? "?force=true" : ""}`;
      const res = await fetch(url, { method: "DELETE" });

      if (res.status === 409) {
        const data = await res.json();
        if (data.error === "financial_data") {
          setBlocked({ kind: "financial", donations: data.donations });
        } else {
          setBlocked({ kind: "related", data: data.related });
        }
        setDeleting(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete person");
        return;
      }

      router.push("/people");
    } catch {
      alert("Failed to delete person");
    } finally {
      setDeleting(false);
    }
  }

  function reset() {
    setConfirming(false);
    setBlocked(null);
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-red-600 hover:text-red-800 text-sm font-medium"
      >
        Delete Person
      </button>
    );
  }

  if (blocked?.kind === "financial") {
    return (
      <div className="border border-amber-200 rounded-md p-4 bg-amber-50 text-sm space-y-2 max-w-sm">
        <p className="font-medium text-amber-900">This person cannot be deleted.</p>
        <p className="text-amber-800">
          They have {blocked.donations} donation record{blocked.donations !== 1 ? "s" : ""} on file. Financial data must be preserved for record-keeping.
        </p>
        <p className="text-amber-800">Consider marking this person as <strong>Inactive</strong> instead.</p>
        <button
          onClick={reset}
          className="text-amber-700 hover:text-amber-900 font-medium text-sm underline"
        >
          OK
        </button>
      </div>
    );
  }

  if (blocked?.kind === "related") {
    const { data } = blocked;
    const lines: string[] = [];
    if (data.eventInvites) lines.push(`${data.eventInvites} event invite${data.eventInvites !== 1 ? "s" : ""}`);
    if (data.notes) lines.push(`${data.notes} note${data.notes !== 1 ? "s" : ""}`);
    if (data.roles) lines.push(`${data.roles} organization role${data.roles !== 1 ? "s" : ""}`);
    if (data.relationships) lines.push(`${data.relationships} relationship${data.relationships !== 1 ? "s" : ""}`);
    if (data.connections) lines.push(`${data.connections} interaction${data.connections !== 1 ? "s" : ""}`);
    if (data.happenings) lines.push(`${data.happenings} happening response${data.happenings !== 1 ? "s" : ""}`);

    return (
      <div className="border border-red-200 rounded-md p-4 bg-red-50 text-sm space-y-3 max-w-sm">
        <p className="font-medium text-red-800">This person has related data that will also be deleted:</p>
        <ul className="list-disc list-inside text-red-700 space-y-0.5">
          {lines.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <p className="text-red-700">This cannot be undone. Are you sure?</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleDelete(true)}
            disabled={deleting}
            className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Yes, Delete Everything"}
          </button>
          <button onClick={reset} className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1.5">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-600">Are you sure?</span>
      <button
        onClick={() => handleDelete(false)}
        disabled={deleting}
        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
      >
        {deleting ? "Checking..." : "Yes, Delete"}
      </button>
      <button onClick={reset} className="text-gray-500 hover:text-gray-700 text-sm">
        Cancel
      </button>
    </div>
  );
}
