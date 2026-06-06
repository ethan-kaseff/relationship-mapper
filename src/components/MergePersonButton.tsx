"use client";

import { useState } from "react";
import MergePersonModal from "./MergePersonModal";

interface Person {
  id: string;
  firstName: string;
  middleInitial: string | null;
  lastName: string;
  prefix: string | null;
  greeting: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phoneNumber: string | null;
  email1: string | null;
  email2: string | null;
  status: string;
  isConnector: boolean;
}

export default function MergePersonButton({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
      >
        Merge Duplicate
      </button>
      {open && <MergePersonModal person={person} onClose={() => setOpen(false)} />}
    </>
  );
}
