"use client";

import { useState } from "react";

interface Props {
  placeholder?: string;
  children: (search: string) => React.ReactNode;
}

export default function TableSearch({ placeholder = "Search...", children }: Props) {
  const [search, setSearch] = useState("");

  return (
    <>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent w-64"
      />
      {children(search.toLowerCase())}
    </>
  );
}
