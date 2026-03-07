"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteRoleButton({ roleId }: { roleId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/partner-roles/${roleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete role");
        return;
      }
      router.refresh();
    } catch {
      alert("Failed to delete role");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-red-600 hover:text-red-800 text-xs font-medium ml-2"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 ml-2">
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
  );
}
