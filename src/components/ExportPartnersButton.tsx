"use client";

import ExcelJS from "exceljs";

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
  async function handleExport() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Partners Without Relationships");

    // Define columns
    worksheet.columns = [
      { header: "Partner Name", key: "name", width: 30 },
      { header: "Organization Type", key: "type", width: 25 },
      { header: "City", key: "city", width: 20 },
      { header: "State", key: "state", width: 15 },
      { header: "Phone", key: "phone", width: 20 },
      { header: "Email", key: "email", width: 30 },
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add data rows
    partners.forEach((p) => {
      worksheet.addRow({
        name: p.organizationName ?? "",
        type: p.organizationType?.typeName ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        phone: p.phoneNumber ?? "",
        email: p.email ?? "",
      });
    });

    // Generate file and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "partners-without-relationships.xlsx";
    link.click();
    URL.revokeObjectURL(url);
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
