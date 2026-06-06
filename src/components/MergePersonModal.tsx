"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

type FieldChoice = "keeper" | "duplicate";

const FIELDS: { key: keyof Person; label: string }[] = [
  { key: "firstName", label: "First Name" },
  { key: "middleInitial", label: "Middle Initial" },
  { key: "lastName", label: "Last Name" },
  { key: "prefix", label: "Prefix" },
  { key: "greeting", label: "Greeting" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip" },
  { key: "phoneNumber", label: "Phone" },
  { key: "email1", label: "Email 1" },
  { key: "email2", label: "Email 2" },
  { key: "status", label: "Status" },
  { key: "isConnector", label: "Connector" },
];

function displayVal(val: string | boolean | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}

export default function MergePersonModal({ person, onClose }: { person: Person; onClose: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Person | null>(null);
  const [choices, setChoices] = useState<Record<string, FieldChoice>>({});
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/people?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setResults((data.people ?? data).filter((p: Person) => p.id !== person.id).slice(0, 8));
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, person.id]);

  function selectDuplicate(dup: Person) {
    setSelected(dup);
    setResults([]);
    setSearch("");
    // Default: keep the current person's value for every field
    const initial: Record<string, FieldChoice> = {};
    for (const { key } of FIELDS) initial[key] = "keeper";
    setChoices(initial);
  }

  async function handleMerge() {
    if (!selected) return;
    setMerging(true);
    setError("");
    try {
      const res = await fetch("/api/people/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keeperId: person.id, duplicateId: selected.id, fields: choices }),
      });
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error ?? "Merge failed.");
      }
    } catch {
      setError("Merge failed.");
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-indigo-900">Merge Person Records</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {!selected ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Search for the duplicate record of <strong>{person.firstName} {person.lastName}</strong>. All their history will be moved to this record, and the duplicate will be deleted.
              </p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                autoFocus
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searching && <p className="text-xs text-gray-400 mt-2">Searching...</p>}
              {results.length > 0 && (
                <ul className="mt-2 border border-gray-200 rounded-md divide-y">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => selectDuplicate(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
                      >
                        <span className="font-medium">{p.lastName}, {p.firstName}</span>
                        {p.email1 && <span className="text-gray-500 ml-2 text-xs">{p.email1}</span>}
                        {p.city && <span className="text-gray-400 ml-2 text-xs">{p.city}, {p.state}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  Choose which value to keep for each field. All history from both records will be combined.
                </p>
                <button onClick={() => setSelected(null)} className="text-xs text-indigo-600 hover:underline">
                  Change selection
                </button>
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden text-sm">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-700 w-28">Field</th>
                      <th className="px-3 py-2 font-semibold text-indigo-900 text-center">
                        <span className="block text-xs font-normal text-gray-500 mb-0.5">Keep this record</span>
                        {person.firstName} {person.lastName}
                      </th>
                      <th className="px-3 py-2 font-semibold text-gray-600 text-center">
                        <span className="block text-xs font-normal text-gray-500 mb-0.5">Delete this record</span>
                        {selected.firstName} {selected.lastName}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {FIELDS.map(({ key, label }) => {
                      const kVal = person[key];
                      const dVal = selected[key];
                      const same = String(kVal) === String(dVal);
                      return (
                        <tr key={key} className={same ? "text-gray-400" : ""}>
                          <td className="px-3 py-2 font-medium text-gray-600">{label}</td>
                          <td className="px-3 py-2 text-center">
                            <label className="flex items-center justify-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={key}
                                checked={choices[key] === "keeper"}
                                onChange={() => setChoices((c) => ({ ...c, [key]: "keeper" }))}
                                disabled={same}
                                className="accent-indigo-600"
                              />
                              <span>{displayVal(kVal)}</span>
                            </label>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <label className="flex items-center justify-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={key}
                                checked={choices[key] === "duplicate"}
                                onChange={() => setChoices((c) => ({ ...c, [key]: "duplicate" }))}
                                disabled={same}
                                className="accent-indigo-600"
                              />
                              <span>{displayVal(dVal)}</span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {selected && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-xs text-gray-500">
              The duplicate record will be permanently deleted after merging.
            </p>
            <button
              onClick={handleMerge}
              disabled={merging}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {merging ? "Merging..." : "Merge & Delete Duplicate"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
