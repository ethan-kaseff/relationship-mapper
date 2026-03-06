"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  roleId: string;
  personName: string;
  personId: string;
  personOfficeId: string | null;
}

export default function RemoveRolePersonButton({ roleId, personName, personId, personOfficeId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [askingEndDate, setAskingEndDate] = useState(false);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [removing, setRemoving] = useState(false);
  const [promptingPartner, setPromptingPartner] = useState(false);
  const [creatingPartner, setCreatingPartner] = useState(false);

  function handleYes() {
    setConfirming(false);
    setAskingEndDate(true);
  }

  async function handleConfirmRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/partner-roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peopleId: null, endDate }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove person from role");
      }

      // Check if person already has an individual partner
      const checkRes = await fetch(`/api/people/${personId}/has-individual-partner`);
      const { exists } = await checkRes.json();

      if (exists) {
        router.refresh();
      } else {
        setAskingEndDate(false);
        setPromptingPartner(true);
      }
    } catch {
      alert("Failed to remove person from role");
      setAskingEndDate(false);
    } finally {
      setRemoving(false);
    }
  }

  async function handleCreatePartner() {
    setCreatingPartner(true);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgPeopleFlag: "P",
          organizationName: personName,
          existingPeopleId: personId,
          officeId: personOfficeId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create partner");
    } catch {
      alert("Failed to create individual partner");
    } finally {
      setCreatingPartner(false);
      setPromptingPartner(false);
      router.refresh();
    }
  }

  function handleDeclinePartner() {
    setPromptingPartner(false);
    router.refresh();
  }

  if (promptingPartner) {
    return (
      <span className="inline-flex items-center gap-1 ml-2">
        <span className="text-xs text-gray-500">Create {personName} as an individual partner?</span>
        <button
          onClick={handleCreatePartner}
          disabled={creatingPartner}
          className="text-indigo-600 hover:underline text-xs font-medium disabled:opacity-50"
        >
          {creatingPartner ? "Creating..." : "Yes"}
        </button>
        <button
          onClick={handleDeclinePartner}
          className="text-gray-500 hover:text-gray-700 text-xs"
        >
          No
        </button>
      </span>
    );
  }

  if (askingEndDate) {
    return (
      <span className="inline-flex items-center gap-2 ml-2">
        <label className="text-xs text-gray-500">End date:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-gray-300 rounded px-2 py-0.5 text-xs"
        />
        <button
          onClick={handleConfirmRemove}
          disabled={removing}
          className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50"
        >
          {removing ? "Removing..." : "Confirm"}
        </button>
        <button
          onClick={() => setAskingEndDate(false)}
          className="text-gray-500 hover:text-gray-700 text-xs"
        >
          Cancel
        </button>
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1 ml-2">
        <span className="text-xs text-gray-500">Remove {personName}?</span>
        <button
          onClick={handleYes}
          className="text-red-600 hover:underline text-xs font-medium"
        >
          Yes
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
