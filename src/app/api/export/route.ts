import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "xlsx";
    const type = url.searchParams.get("type") || "people";
    const officeFilter = await getOfficeFilterFromRequest(request);

    // Fetch data based on office filter
    const [people, partners, relationships, interactions, roles] = await Promise.all([
      format === "xlsx" || type === "people"
        ? prisma.people.findMany({
            where: officeFilter,
            include: { office: { select: { name: true } } },
            orderBy: { lastName: "asc" },
          })
        : Promise.resolve([]),
      format === "xlsx" || type === "partners"
        ? prisma.partner.findMany({
            where: officeFilter,
            include: {
              organizationType: { select: { typeName: true } },
              office: { select: { name: true } },
            },
            orderBy: { organizationName: "asc" },
          })
        : Promise.resolve([]),
      format === "xlsx" || type === "relationships"
        ? prisma.relationship.findMany({
            where: { person: officeFilter },
            include: {
              person: { select: { firstName: true, lastName: true } },
              targetPerson: { select: { firstName: true, lastName: true } },
              relationshipType: { select: { relationshipDesc: true } },
              partnerRole: {
                select: {
                  roleDescription: true,
                  partner: { select: { organizationName: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      format === "xlsx" || type === "interactions"
        ? prisma.connection.findMany({
            where: { person: officeFilter },
            include: {
              person: { select: { firstName: true, lastName: true } },
              partnerRole: {
                select: {
                  roleDescription: true,
                  partner: { select: { organizationName: true } },
                },
              },
            },
            orderBy: { connectionDate: "desc" },
          })
        : Promise.resolve([]),
      format === "xlsx" || type === "roles"
        ? prisma.partnerRole.findMany({
            where: { partner: officeFilter },
            include: {
              partner: {
                select: {
                  organizationName: true,
                  office: { select: { name: true } },
                },
              },
              person: { select: { firstName: true, lastName: true } },
            },
            orderBy: { roleDescription: "asc" },
          })
        : Promise.resolve([]),
    ]);

    if (format === "csv") {
      let csvContent = "";
      let filename = "";

      if (type === "people") {
        filename = "people.csv";
        csvContent = buildPeopleCsv(people);
      } else if (type === "partners") {
        filename = "partners.csv";
        csvContent = buildPartnersCsv(partners);
      } else if (type === "relationships") {
        filename = "relationships.csv";
        csvContent = buildRelationshipsCsv(relationships);
      } else if (type === "interactions") {
        filename = "interactions.csv";
        csvContent = buildInteractionsCsv(interactions);
      } else if (type === "roles") {
        filename = "roles.csv";
        csvContent = buildRolesCsv(roles);
      } else {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // XLSX format — single workbook with 4 sheets
    const workbook = new ExcelJS.Workbook();

    // People sheet
    const peopleSheet = workbook.addWorksheet("People");
    peopleSheet.columns = [
      { header: "First Name", key: "firstName", width: 15 },
      { header: "Last Name", key: "lastName", width: 15 },
      { header: "Prefix", key: "prefix", width: 15 },
      { header: "Greeting", key: "greeting", width: 25 },
      { header: "Address", key: "address", width: 25 },
      { header: "City", key: "city", width: 15 },
      { header: "State", key: "state", width: 10 },
      { header: "Zip", key: "zip", width: 10 },
      { header: "Phone", key: "phoneNumber", width: 15 },
      { header: "Email", key: "personalEmail", width: 25 },
      { header: "Is Connector", key: "isConnector", width: 12 },
      { header: "Office", key: "office", width: 20 },
    ];
    for (const p of people) {
      peopleSheet.addRow({
        firstName: p.firstName,
        lastName: p.lastName,
        prefix: p.prefix ?? "",
        greeting: p.greeting ?? "",
        address: p.address ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        zip: p.zip ?? "",
        phoneNumber: p.phoneNumber ?? "",
        personalEmail: p.personalEmail ?? "",
        isConnector: p.isConnector ? "Yes" : "No",
        office: (p as Record<string, unknown> & { office: { name: string } }).office.name,
      });
    }
    styleHeaderRow(peopleSheet);

    // Partners sheet
    const partnersSheet = workbook.addWorksheet("Partners");
    partnersSheet.columns = [
      { header: "Type", key: "orgPeopleFlag", width: 12 },
      { header: "Name", key: "organizationName", width: 25 },
      { header: "Org Type", key: "orgType", width: 20 },
      { header: "Address", key: "address", width: 25 },
      { header: "City", key: "city", width: 15 },
      { header: "State", key: "state", width: 10 },
      { header: "Zip", key: "zip", width: 10 },
      { header: "Phone", key: "phoneNumber", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Website", key: "website", width: 25 },
      { header: "Priority", key: "priority", width: 10 },
      { header: "Office", key: "office", width: 20 },
    ];
    for (const p of partners) {
      const pt = p as Record<string, unknown> & {
        organizationType: { typeName: string } | null;
        office: { name: string };
      };
      partnersSheet.addRow({
        orgPeopleFlag: p.orgPeopleFlag === "O" ? "Organization" : "Person",
        organizationName: p.organizationName ?? "",
        orgType: pt.organizationType?.typeName ?? "",
        address: p.address ?? "",
        city: p.city ?? "",
        state: p.state ?? "",
        zip: p.zip ?? "",
        phoneNumber: p.phoneNumber ?? "",
        email: p.email ?? "",
        website: p.website ?? "",
        priority: p.priority ?? "",
        office: pt.office.name,
      });
    }
    styleHeaderRow(partnersSheet);

    // Relationships sheet
    const relSheet = workbook.addWorksheet("Relationships");
    relSheet.columns = [
      { header: "Connector", key: "connector", width: 20 },
      { header: "Target Person", key: "target", width: 20 },
      { header: "Relationship Type", key: "relType", width: 20 },
      { header: "Partner", key: "partner", width: 20 },
      { header: "Role", key: "role", width: 20 },
      { header: "Last Reviewed", key: "lastReviewed", width: 15 },
    ];
    for (const r of relationships) {
      const rel = r as Record<string, unknown> & {
        person: { firstName: string; lastName: string };
        targetPerson: { firstName: string; lastName: string };
        relationshipType: { relationshipDesc: string };
        partnerRole: { roleDescription: string; partner: { organizationName: string | null } } | null;
      };
      relSheet.addRow({
        connector: `${rel.person.firstName} ${rel.person.lastName}`,
        target: `${rel.targetPerson.firstName} ${rel.targetPerson.lastName}`,
        relType: rel.relationshipType.relationshipDesc,
        partner: rel.partnerRole?.partner?.organizationName ?? "",
        role: rel.partnerRole?.roleDescription ?? "",
        lastReviewed: r.lastReviewedDate
          ? new Date(r.lastReviewedDate).toLocaleDateString()
          : "",
      });
    }
    styleHeaderRow(relSheet);

    // Interactions sheet
    const intSheet = workbook.addWorksheet("Interactions");
    intSheet.columns = [
      { header: "Person", key: "person", width: 20 },
      { header: "Partner", key: "partner", width: 20 },
      { header: "Role", key: "role", width: 20 },
      { header: "Date", key: "date", width: 15 },
      { header: "Time", key: "time", width: 10 },
      { header: "Notes", key: "notes", width: 40 },
    ];
    for (const c of interactions) {
      const conn = c as Record<string, unknown> & {
        person: { firstName: string; lastName: string };
        partnerRole: { roleDescription: string; partner: { organizationName: string | null } };
      };
      intSheet.addRow({
        person: `${conn.person.firstName} ${conn.person.lastName}`,
        partner: conn.partnerRole?.partner?.organizationName ?? "",
        role: conn.partnerRole?.roleDescription ?? "",
        date: new Date(c.connectionDate).toLocaleDateString(),
        time: c.connectionTime ?? "",
        notes: c.notes ?? "",
      });
    }
    styleHeaderRow(intSheet);

    // Roles sheet
    const rolesSheet = workbook.addWorksheet("Roles");
    rolesSheet.columns = [
      { header: "Partner", key: "partner", width: 25 },
      { header: "Role Description", key: "role", width: 25 },
      { header: "Person", key: "person", width: 20 },
      { header: "Office", key: "office", width: 20 },
    ];
    for (const r of roles) {
      const role = r as Record<string, unknown> & {
        partner: { organizationName: string | null; office: { name: string } };
        person: { firstName: string; lastName: string } | null;
      };
      rolesSheet.addRow({
        partner: role.partner?.organizationName ?? "",
        role: r.roleDescription,
        person: role.person
          ? `${role.person.firstName} ${role.person.lastName}`
          : "",
        office: role.partner?.office?.name ?? "",
      });
    }
    styleHeaderRow(rolesSheet);

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="relationship-mapper-export.xlsx"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E75B6" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
}

function escapeCsv(val: unknown): string {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(",");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPeopleCsv(people: any[]): string {
  const headers = ["First Name", "Last Name", "Prefix", "Greeting", "Address", "City", "State", "Zip", "Phone", "Email", "Is Connector", "Office"];
  const rows = [toCsvRow(headers)];
  for (const p of people) {
    rows.push(
      toCsvRow([
        p.firstName, p.lastName, p.prefix, p.greeting,
        p.address, p.city, p.state, p.zip,
        p.phoneNumber, p.personalEmail, p.isConnector ? "Yes" : "No",
        p.office?.name ?? "",
      ])
    );
  }
  return rows.join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPartnersCsv(partners: any[]): string {
  const headers = ["Type", "Name", "Org Type", "Address", "City", "State", "Zip", "Phone", "Email", "Website", "Priority", "Office"];
  const rows = [toCsvRow(headers)];
  for (const p of partners) {
    rows.push(
      toCsvRow([
        p.orgPeopleFlag === "O" ? "Organization" : "Person",
        p.organizationName, p.organizationType?.typeName ?? "",
        p.address, p.city, p.state, p.zip, p.phoneNumber,
        p.email, p.website, p.priority ?? "",
        p.office?.name ?? "",
      ])
    );
  }
  return rows.join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRelationshipsCsv(relationships: any[]): string {
  const headers = ["Connector", "Target Person", "Relationship Type", "Partner", "Role", "Last Reviewed"];
  const rows = [toCsvRow(headers)];
  for (const r of relationships) {
    rows.push(
      toCsvRow([
        `${r.person.firstName} ${r.person.lastName}`,
        `${r.targetPerson.firstName} ${r.targetPerson.lastName}`,
        r.relationshipType.relationshipDesc,
        r.partnerRole?.partner?.organizationName ?? "",
        r.partnerRole?.roleDescription ?? "",
        r.lastReviewedDate ? new Date(r.lastReviewedDate).toLocaleDateString() : "",
      ])
    );
  }
  return rows.join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRolesCsv(roles: any[]): string {
  const headers = ["Partner Name", "Role Description", "Person", "Office"];
  const rows = [toCsvRow(headers)];
  for (const r of roles) {
    rows.push(
      toCsvRow([
        r.partner?.organizationName ?? "",
        r.roleDescription,
        r.person ? `${r.person.firstName} ${r.person.lastName}` : "",
        r.partner?.office?.name ?? "",
      ])
    );
  }
  return rows.join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInteractionsCsv(interactions: any[]): string {
  const headers = ["Person", "Partner", "Role", "Date", "Time", "Notes"];
  const rows = [toCsvRow(headers)];
  for (const c of interactions) {
    rows.push(
      toCsvRow([
        `${c.person.firstName} ${c.person.lastName}`,
        c.partnerRole?.partner?.organizationName ?? "",
        c.partnerRole?.roleDescription ?? "",
        new Date(c.connectionDate).toLocaleDateString(),
        c.connectionTime ?? "",
        c.notes ?? "",
      ])
    );
  }
  return rows.join("\n");
}
