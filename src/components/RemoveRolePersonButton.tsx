"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  roleId: string;
  personName: string;
}

export default function RemoveRolePersonButton({ roleId, personName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/partner-roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peopleId: null }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove person from role");
      }

      router.refresh();
    } catch {
      alert("Failed to remove person from role");
    } finally {
      setRemoving(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1 ml-2">
        <span className="text-xs text-gray-500">Remove {personName}?</span>
        <button
          onClick={handleRemove}
          disabled={removing}
          className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50"
        >
          {removing ? "Removing..." : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-gray-500 hover:text-gray-700 text-xs"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-red-600 hover:underline text-xs ml-2"
    >
      Remove
    </button>
  );
}
