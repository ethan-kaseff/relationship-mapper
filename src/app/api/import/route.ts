import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import ExcelJS from "exceljs";

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!type || !["people", "partners", "roles"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'people', 'partners', or 'roles'" },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let rows: Record<string, string>[];

    if (fileName.endsWith(".csv")) {
      rows = parseCsv(buffer.toString("utf-8"));
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      rows = await parseXlsx(buffer);
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please use .csv or .xlsx" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "File contains no data rows" },
        { status: 400 }
      );
    }

    const userRole = authResult.session.user.role;
    const userOfficeId = authResult.session.user.officeId;

    // Look up offices for mapping office names to IDs
    const allOffices = await prisma.office.findMany({
      select: { id: true, name: true },
    });
    const officeByName = new Map(
      allOffices.map((o) => [o.name.toLowerCase(), o.id])
    );

    const errors: { row: number; message: string }[] = [];
    let created = 0;

    // Helper to build a dedup key for a person
    function personKey(prefix: string | null, firstName: string, middleInitial: string | null, lastName: string, officeId: string) {
      return `${(prefix || "").toLowerCase()}|${firstName.toLowerCase()}|${(middleInitial || "").toLowerCase()}|${lastName.toLowerCase()}|${officeId}`;
    }

    if (type === "people") {
      // Pre-load existing people for duplicate checking
      const existingPeople = await prisma.people.findMany({
        select: { prefix: true, firstName: true, middleInitial: true, lastName: true, officeId: true },
      });
      const existingKeys = new Set(
        existingPeople.map((p) => personKey(p.prefix, p.firstName, p.middleInitial, p.lastName, p.officeId))
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // 1-based, account for header

        const firstName = row["first name"] || row["firstname"] || "";
        const lastName = row["last name"] || row["lastname"] || "";

        if (!firstName.trim() && !lastName.trim()) {
          errors.push({ row: rowNum, message: "Missing first and last name" });
          continue;
        }

        // Determine office
        let officeId = userOfficeId;
        if (userRole === "SYSTEM_ADMIN") {
          const officeName = row["office"] || "";
          if (officeName) {
            const foundId = officeByName.get(officeName.toLowerCase());
            if (!foundId) {
              errors.push({
                row: rowNum,
                message: `Office "${officeName}" not found`,
              });
              continue;
            }
            officeId = foundId;
          }
        }

        const prefix = row["prefix"] || row["professional prefix"] || null;
        const middleInitial = row["middle initial"] || row["middleinitial"] || row["mi"] || null;
        const key = personKey(prefix, firstName.trim(), middleInitial, lastName.trim(), officeId);

        if (existingKeys.has(key)) {
          errors.push({ row: rowNum, message: `Duplicate: "${firstName.trim()} ${lastName.trim()}" already exists` });
          continue;
        }

        try {
          await prisma.people.create({
            data: {
              firstName: firstName.trim(),
              middleInitial,
              lastName: lastName.trim(),
              address: row["address"] || null,
              city: row["city"] || null,
              state: row["state"] || null,
              zip: row["zip"] || null,
              prefix,
              greeting: row["greeting"] || row["personalized greeting"] || null,
              phoneNumber: row["phone"] || row["phone number"] || row["phonenumber"] || null,
              personalEmail: row["email"] || row["personal email"] || row["personalemail"] || null,
              isConnector:
                (row["is connector"] || row["isconnector"] || "")
                  .toLowerCase() === "yes",
              officeId,
            },
          });
          existingKeys.add(key);
          created++;
        } catch (err) {
          errors.push({
            row: rowNum,
            message: err instanceof Error ? err.message : "Failed to create",
          });
        }
      }
    } else if (type === "roles") {
      // Roles import — match partner by name, optionally match person by name
      const officeScope = userRole === "SYSTEM_ADMIN" ? {} : { officeId: userOfficeId };
      const allPartners = await prisma.partner.findMany({
        where: officeScope,
        select: { id: true, organizationName: true, officeId: true },
      });
      const partnerByName = new Map(
        allPartners.map((p) => [p.organizationName?.toLowerCase() ?? "", p.id])
      );

      const allPeople = await prisma.people.findMany({
        where: officeScope,
        select: { id: true, firstName: true, lastName: true },
      });
      const personByName = new Map(
        allPeople.map((p) => [`${p.firstName} ${p.lastName}`.toLowerCase(), p.id])
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const partnerName = row["partner name"] || row["partnername"] || row["partner"] || "";
        const roleDesc = row["role description"] || row["roledescription"] || row["role"] || "";

        if (!partnerName.trim()) {
          errors.push({ row: rowNum, message: "Missing partner name" });
          continue;
        }
        if (!roleDesc.trim()) {
          errors.push({ row: rowNum, message: "Missing role description" });
          continue;
        }

        const partnerId = partnerByName.get(partnerName.trim().toLowerCase());
        if (!partnerId) {
          errors.push({ row: rowNum, message: `Partner "${partnerName.trim()}" not found` });
          continue;
        }

        let peopleId: string | null = null;
        const personName = row["person"] || row["person name"] || row["personname"] || "";
        if (personName.trim()) {
          const foundId = personByName.get(personName.trim().toLowerCase());
          if (!foundId) {
            errors.push({ row: rowNum, message: `Person "${personName.trim()}" not found` });
            continue;
          }
          peopleId = foundId;
        }

        try {
          await prisma.partnerRole.create({
            data: {
              partnerId,
              roleDescription: roleDesc.trim(),
              peopleId,
            },
          });
          created++;
        } catch (err) {
          errors.push({
            row: rowNum,
            message: err instanceof Error ? err.message : "Failed to create",
          });
        }
      }
    } else {
      // Pre-load existing people for duplicate checking (partner "P" creates people)
      const existingPeopleForPartners = await prisma.people.findMany({
        select: { prefix: true, firstName: true, middleInitial: true, lastName: true, officeId: true },
      });
      const existingPeopleKeys = new Set(
        existingPeopleForPartners.map((p) => personKey(p.prefix, p.firstName, p.middleInitial, p.lastName, p.officeId))
      );

      // Partners import
      const orgTypes = await prisma.organizationType.findMany({
        select: { id: true, typeName: true },
      });
      const orgTypeByName = new Map(
        orgTypes.map((t) => [t.typeName.toLowerCase(), t.id])
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        const name = row["name"] || row["organization name"] || row["organizationname"] || "";

        if (!name.trim()) {
          errors.push({ row: rowNum, message: "Missing name" });
          continue;
        }

        // Determine type flag
        const typeVal = (row["type"] || "Organization").trim();
        const orgPeopleFlag =
          typeVal.toLowerCase() === "person" || typeVal === "P" ? "P" : "O";

        // Look up org type
        const orgTypeName = row["org type"] || row["orgtype"] || row["organization type"] || "";
        let organizationTypeId: string | null = null;
        if (orgTypeName) {
          const foundId = orgTypeByName.get(orgTypeName.trim().toLowerCase());
          if (foundId) {
            organizationTypeId = foundId;
          } else {
            // Auto-create the organization type
            const newOrgType = await prisma.organizationType.create({
              data: { typeName: orgTypeName.trim() },
            });
            organizationTypeId = newOrgType.id;
            orgTypeByName.set(orgTypeName.trim().toLowerCase(), newOrgType.id);
          }
        }

        // Determine office
        let officeId = userOfficeId;
        if (userRole === "SYSTEM_ADMIN") {
          const officeName = row["office"] || "";
          if (officeName) {
            const foundId = officeByName.get(officeName.toLowerCase());
            if (!foundId) {
              errors.push({
                row: rowNum,
                message: `Office "${officeName}" not found`,
              });
              continue;
            }
            officeId = foundId;
          }
        }

        const priorityStr = row["priority"] || "";
        const priority = priorityStr ? parseInt(priorityStr, 10) : null;

        try {
          await prisma.partner.create({
            data: {
              orgPeopleFlag,
              organizationName: name.trim(),
              organizationTypeId,
              address: row["address"] || null,
              city: row["city"] || null,
              state: row["state"] || null,
              zip: row["zip"] || null,
              phoneNumber: row["phone"] || row["phone number"] || row["phonenumber"] || null,
              email: row["email"] || null,
              website: row["website"] || null,
              priority: priority !== null && !isNaN(priority) ? priority : undefined,
              officeId,
            },
          });

          // If this partner is a Person, also create a People record (if not a duplicate)
          if (orgPeopleFlag === "P") {
            const nameParts = name.trim().split(/\s+/);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            const prefix = row["prefix"] || row["professional prefix"] || null;
            const middleInitial = row["middle initial"] || row["middleinitial"] || row["mi"] || null;
            const pKey = personKey(prefix, firstName, middleInitial, lastName, officeId);

            if (!existingPeopleKeys.has(pKey)) {
              await prisma.people.create({
                data: {
                  firstName,
                  middleInitial,
                  lastName,
                  prefix,
                  greeting: row["greeting"] || row["personalized greeting"] || null,
                  address: row["address"] || null,
                  city: row["city"] || null,
                  state: row["state"] || null,
                  zip: row["zip"] || null,
                  phoneNumber: row["phone"] || row["phone number"] || row["phonenumber"] || null,
                  personalEmail: row["email"] || null,
                  officeId,
                },
              });
              existingPeopleKeys.add(pKey);
            }
          }

          created++;
        } catch (err) {
          errors.push({
            row: rowNum,
            message: err instanceof Error ? err.message : "Failed to create",
          });
        }
      }
    }

    return NextResponse.json({ created, errors, total: rows.length });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Parse a CSV string into an array of row objects with lowercase header keys.
 */
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse an XLSX file into an array of row objects with lowercase header keys.
 */
async function parseXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "")
      .toLowerCase()
      .trim();
  });

  const rows: Record<string, string>[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const obj: Record<string, string> = {};
    let hasData = false;
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber - 1];
      if (key) {
        obj[key] = String(cell.value ?? "").trim();
        if (obj[key]) hasData = true;
      }
    });
    if (hasData) rows.push(obj);
  }

  return rows;
}
