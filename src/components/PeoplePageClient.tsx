"use client";

import { useState, useEffect } from "react";
import PeopleTable from "@/components/PeopleTable";
import AdvancedSearchPanel from "@/components/AdvancedSearch/AdvancedSearchPanel";

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
}

interface Props {
  people: Person[];
}

export default function PeoplePageClient({ people }: Props) {
  const [advancedMode, setAdvancedMode] = useState(false);

  // Restore advanced mode state across page navigations
  useEffect(() => {
    if (sessionStorage.getItem("adv-search-active") === "true") {
      setAdvancedMode(true);
    }
  }, []);

  function openAdvanced() {
    try { sessionStorage.setItem("adv-search-active", "true"); } catch { /* sessionStorage unavailable */ }
    setAdvancedMode(true);
  }

  function closeAdvanced() {
    try { sessionStorage.setItem("adv-search-active", "false"); } catch { /* sessionStorage unavailable */ }
    setAdvancedMode(false);
  }

  if (advancedMode) {
    return <AdvancedSearchPanel mode="page" onClose={closeAdvanced} />;
  }

  return <PeopleTable people={people} onAdvancedSearch={openAdvanced} />;
}
