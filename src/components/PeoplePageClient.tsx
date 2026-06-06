"use client";

import { useState, useEffect } from "react";
import PeopleTable from "@/components/PeopleTable";
import AdvancedSearchPanel from "@/components/AdvancedSearch/AdvancedSearchPanel";
import type { AdvancedSearchPerson } from "@/components/AdvancedSearch/types";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  city: string | null;
  state: string | null;
  phoneNumber: string | null;
  email1: string | null;
  email2: string | null;
  isConnector: boolean;
  status: string;
  tagIds: string[];
  createdAt: string;
}

interface Props {
  people: Person[];
}

function toPersonShape(p: AdvancedSearchPerson): Person {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    city: p.city,
    state: p.state,
    phoneNumber: p.phoneNumber,
    email1: p.email1,
    email2: p.email2,
    isConnector: false,
    status: p.status,
    tagIds: [],
    createdAt: "",
  };
}

export default function PeoplePageClient({ people }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedResults, setAdvancedResults] = useState<AdvancedSearchPerson[] | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("adv-search-active") === "true") {
      setAdvancedOpen(true);
    }
  }, []);

  function toggleAdvanced() {
    const next = !advancedOpen;
    try { sessionStorage.setItem("adv-search-active", next ? "true" : "false"); } catch { /* sessionStorage unavailable */ }
    setAdvancedOpen(next);
    if (!next) setAdvancedResults(null);
  }

  function closeAdvanced() {
    try { sessionStorage.setItem("adv-search-active", "false"); } catch { /* sessionStorage unavailable */ }
    setAdvancedOpen(false);
    setAdvancedResults(null);
  }

  const displayPeople = advancedResults !== null
    ? advancedResults.map(toPersonShape)
    : people;

  return (
    <>
      {advancedOpen && (
        <AdvancedSearchPanel
          mode="inline"
          onResults={setAdvancedResults}
          onClose={closeAdvanced}
        />
      )}
      <PeopleTable
        people={displayPeople}
        advancedOpen={advancedOpen}
        advancedResultCount={advancedResults !== null ? advancedResults.length : null}
        onToggleAdvanced={toggleAdvanced}
      />
    </>
  );
}
