"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "@/components/SearchableSelect";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  roleId: string;
  currentPersonId: string | null;
}

export default function AssignRolePersonButton({ roleId, currentPersonId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/people")
        .then((res) => res.json())
        .then((data) => setPeople(data))
        .catch(() => {});
    }
  }, [open]);

  async function handleAssign() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/partner-roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peopleId: selectedId }),
      });
      if (!res.ok) throw new Error("Failed");
      setOpen(false);
      setSelectedId("");
      router.refresh();
    } catch {
      alert("Failed to assign person to role");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[#2E75B6] hover:underline text-xs ml-2"
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
      <span className="w-48">
        <SearchableSelect
          options={personOptions}
          value={selectedId}
          onChange={setSelectedId}
          placeholder="Search people..."
        />
      </span>
      <button
        onClick={handleAssign}
        disabled={saving || !selectedId}
        className="text-[#2E75B6] hover:underline text-xs font-medium disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
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
