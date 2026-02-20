"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePersonButton({ personId }: { personId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/people/${personId}`, {
        method: "DELETE",
      });
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

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-600">Are you sure?</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm disabled:opacity-50"
      >
        {deleting ? "Deleting..." : "Yes, Delete"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-gray-500 hover:text-gray-700 text-sm"
      >
        Cancel
      </button>
    </div>
  );
}
