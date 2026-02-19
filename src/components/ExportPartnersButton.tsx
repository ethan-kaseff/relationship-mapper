"use client";

import { utils, writeFileXLSX } from "xlsx";

interface Partner {
  id: string;
  organizationName: string | null;
  city: string | null;
  state: string | null;
  phoneNumber: string | null;
  email: string | null;
  organizationType: { typeName: string } | null;
}

export default function ExportPartnersButton({ partners }: { partners: Partner[] }) {
  function handleExport() {
    const rows = partners.map((p) => ({
      "Partner Name": p.organizationName ?? "",
      "Organization Type": p.organizationType?.typeName ?? "",
      City: p.city ?? "",
      State: p.state ?? "",
      Phone: p.phoneNumber ?? "",
      Email: p.email ?? "",
    }));

    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Partners Without Relationships");

    // Auto-size columns
    ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 25 }));

    writeFileXLSX(wb, "partners-without-relationships.xlsx");
  }

  if (partners.length === 0) return null;

  return (
    <button
      onClick={handleExport}
      className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition-colors"
    >
      Export to Excel
    </button>
  );
}
