"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";
import OfficeDataToggle from "@/components/OfficeDataToggle";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  roleId: string;
  currentPersonId: string | null;
  currentPersonName?: string;
  currentOfficeId?: string | null;
}

export default function AssignRolePersonButton({ roleId, currentPersonId, currentPersonName, currentOfficeId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [promptingPartner, setPromptingPartner] = useState(false);
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [replacedPersonName, setReplacedPersonName] = useState("");
  const [replacedPersonId, setReplacedPersonId] = useState("");
  const [replacedOfficeId, setReplacedOfficeId] = useState<string | null>(null);

  // Date prompt state
  const [askingDates, setAskingDates] = useState(false);
  const [pendingPersonId, setPendingPersonId] = useState("");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [startDate, setStartDate] = useState("");

  const fetchPeople = useCallback(() => {
    fetch("/api/people")
      .then((res) => res.json())
      .then((data) => setPeople(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) fetchPeople();
  }, [open, fetchPeople]);

  function handleSaveClick() {
    if (!selectedId) return;
    setPendingPersonId(selectedId);
    setEndDate(new Date().toISOString().split("T")[0]);
    setStartDate("");
    setOpen(false);
    setAskingDates(true);
  }

  async function handleConfirmAssign() {
    setSaving(true);

    // Capture old person info before reassignment
    const hadPreviousPerson = !!currentPersonId;
    const oldPersonId = currentPersonId;
    const oldPersonName = currentPersonName || "";
    const oldOfficeId = currentOfficeId ?? null;

    try {
      const res = await fetch(`/api/partner-roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peopleId: pendingPersonId,
          ...(hadPreviousPerson ? { endDate } : {}),
          startDate: startDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setAskingDates(false);
      setSelectedId("");
      setPendingPersonId("");

      // Check if old person needs an individual partner
      if (hadPreviousPerson && oldPersonId) {
        const checkRes = await fetch(`/api/people/${oldPersonId}/has-individual-partner`);
        const { exists } = await checkRes.json();

        if (!exists) {
          setReplacedPersonId(oldPersonId);
          setReplacedPersonName(oldPersonName);
          setReplacedOfficeId(oldOfficeId);
          setPromptingPartner(true);
          return;
        }
      }

      router.refresh();
    } catch {
      alert("Failed to assign person to role");
    } finally {
      setSaving(false);
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
          organizationName: replacedPersonName,
          existingPeopleId: replacedPersonId,
          officeId: replacedOfficeId,
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
        <span className="text-xs text-gray-500">Create {replacedPersonName} as an individual partner?</span>
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

  if (askingDates) {
    const isReassigning = !!currentPersonId;
    return (
      <span className="inline-flex items-center gap-2 ml-2 flex-wrap">
        {isReassigning && (
          <>
            <label className="text-xs text-gray-500">End date for {currentPersonName}:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-0.5 text-xs"
            />
          </>
        )}
        <label className="text-xs text-gray-500">Start date:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-gray-300 rounded px-2 py-0.5 text-xs"
        />
        <button
          onClick={handleConfirmAssign}
          disabled={saving}
          className="text-indigo-600 hover:underline text-xs font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Confirm"}
        </button>
        <button
          onClick={() => { setAskingDates(false); setOpen(true); }}
          className="text-gray-500 hover:text-gray-700 text-xs"
        >
          Cancel
        </button>
      </span>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-indigo-600 hover:underline text-xs ml-2"
      >
        {currentPersonId ? "Reassign" : "Assign Person"}
      </button>
    );
  }

  const personOptions = people
    .filter((p) => p.id !== currentPersonId)
    .map((p) => ({
      value: p.id,
      label: `${p.lastName}, ${p.firstName}`,
    }));

  return (
    <span className="inline-flex items-center gap-2 ml-2">
      <OfficeDataToggle onToggle={() => fetchPeople()} />
      <span className="w-48">
        <SearchableSelect
          options={personOptions}
          value={selectedId}
          onChange={setSelectedId}
          placeholder="Search people..."
        />
      </span>
      <button
        onClick={handleSaveClick}
        disabled={!selectedId}
        className="text-indigo-600 hover:underline text-xs font-medium disabled:opacity-50"
      >
        Save
      </button>
      <button
        onClick={() => { setOpen(false); setSelectedId(""); }}
        className="text-gray-500 hover:text-gray-700 text-xs"
      >
        Cancel
      </button>
    </span>
  );
}
