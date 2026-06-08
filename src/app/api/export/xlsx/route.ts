import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

type SheetDef = { name: string; headers: string[]; rows: string[][] };

function applySheet(workbook: ExcelJS.Workbook, def: SheetDef) {
  const sheet = workbook.addWorksheet(def.name);
  sheet.addRow(def.headers);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };
  def.rows.forEach((row) => sheet.addRow(row));
  def.headers.forEach((_, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = Math.max(
      def.headers[i].length + 2,
      ...def.rows.map((r) => (r[i] ?? "").length),
      12
    );
  });
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const body = (await request.json()) as {
      filename: string;
      headers?: string[];
      rows?: string[][];
      sheets?: SheetDef[];
    };

    const workbook = new ExcelJS.Workbook();

    if (body.sheets) {
      body.sheets.forEach((s) => applySheet(workbook, s));
    } else {
      applySheet(workbook, { name: "Notices", headers: body.headers!, rows: body.rows! });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${body.filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
