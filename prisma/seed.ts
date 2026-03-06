import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString("base64");
}

async function main() {
  console.log("Seeding database...");

  // ─── Default Office ────────────────────────────────────────────────────
  const mainOffice = await prisma.office.upsert({
    where: { name: "Main Office" },
    update: {},
    create: { name: "Main Office" },
  });
  console.log("  Created default office (Main Office)");

  // ─── Organization Types ──────────────────────────────────────────────────
  const orgTypes = [
    "Federal Government",
    "State Government",
    "Local Government",
    "Faith Tradition",
    "Business",
    "Media",
    "Education",
    "Healthcare",
    "Nonprofit / NGO",
    "Law Enforcement",
  ];

  const orgTypeRecords: Record<string, string> = {};
  for (const name of orgTypes) {
    const ot = await prisma.organizationType.upsert({
      where: { typeName: name },
      update: {},
      create: { typeName: name },
    });
    orgTypeRecords[name] = ot.id;
  }
  console.log(`  Created ${orgTypes.length} organization types`);

  // ─── Relationship Types ──────────────────────────────────────────────────
  const relTypes = [
    { desc: "Close Friend", notes: "Personal relationship; regular social contact" },
    { desc: "Can Text", notes: "Has their mobile number and can reach out directly" },
    { desc: "Professional Contact", notes: "Knows them through work; formal relationship" },
    { desc: "Acquaintance", notes: "Has met; occasional interaction" },
    { desc: "Met Once", notes: "Met at an event or meeting; minimal relationship" },
    { desc: "No Direct Relationship", notes: "Know of them but no personal connection yet" },
  ];

  const relTypeRecords: Record<string, string> = {};
  for (const rt of relTypes) {
    const existing = await prisma.relationshipType.findFirst({
      where: { relationshipDesc: rt.desc },
    });
    if (existing) {
      relTypeRecords[rt.desc] = existing.id;
    } else {
      const r = await prisma.relationshipType.create({
        data: { relationshipDesc: rt.desc, notes: rt.notes },
      });
      relTypeRecords[rt.desc] = r.id;
    }
  }
  console.log(`  Created ${relTypes.length} relationship types`);

  // ─── Sample People (Connectors) ─────────────────────────────────────────
  const connectors = [
    { firstName: "Sarah", lastName: "Cohen", city: "Overland Park", state: "KS", personalEmail: "sarah.cohen@example.com", phoneNumber: "913-555-0101" },
    { firstName: "David", lastName: "Goldberg", city: "Kansas City", state: "MO", personalEmail: "david.g@example.com", phoneNumber: "816-555-0202" },
    { firstName: "Rachel", lastName: "Weiss", city: "Leawood", state: "KS", personalEmail: "rachel.w@example.com", phoneNumber: "913-555-0303" },
  ];

  const connectorRecords: string[] = [];
  for (const c of connectors) {
    const existing = await prisma.people.findFirst({
      where: { firstName: c.firstName, lastName: c.lastName, isConnector: true },
    });
    if (existing) {
      connectorRecords.push(existing.id);
    } else {
      const p = await prisma.people.create({
        data: { ...c, isConnector: true, officeId: mainOffice.id },
      });
      connectorRecords.push(p.id);
    }
  }
  console.log(`  Created ${connectors.length} connectors`);

  // ─── Sample People (Partner Contacts) ────────────────────────────────────
  const contacts = [
    { firstName: "Laura", lastName: "Kelly", city: "Topeka", state: "KS", personalEmail: "governor@ks.gov" },
    { firstName: "David", lastName: "Toland", city: "Topeka", state: "KS" },
    { firstName: "James", lastName: "Mitchell", city: "Kansas City", state: "MO", personalEmail: "jmitchell@faithorg.com" },
    { firstName: "Maria", lastName: "Rodriguez", city: "Kansas City", state: "MO", personalEmail: "maria.r@kcbusiness.com" },
  ];

  const contactRecords: string[] = [];
  for (const c of contacts) {
    const existing = await prisma.people.findFirst({
      where: { firstName: c.firstName, lastName: c.lastName, isConnector: false },
    });
    if (existing) {
      contactRecords.push(existing.id);
    } else {
      const p = await prisma.people.create({
        data: { ...c, isConnector: false, officeId: mainOffice.id },
      });
      contactRecords.push(p.id);
    }
  }
  console.log(`  Created ${contacts.length} partner contacts`);

  // ─── Sample Partners (Organizations) ─────────────────────────────────────
  let govOffice = await prisma.partner.findFirst({
    where: { organizationName: "Kansas Governor's Office" },
  });
  if (!govOffice) {
    govOffice = await prisma.partner.create({
      data: {
        orgPeopleFlag: "O",
        organizationName: "Kansas Governor's Office",
        organizationTypeId: orgTypeRecords["State Government"],
        address: "300 SW 10th Ave",
        city: "Topeka",
        state: "KS",
        zip: "66612",
        phoneNumber: "785-296-3232",
        website: "https://governor.kansas.gov",
        officeId: mainOffice.id,
      },
    });
  }

  let churchOrg = await prisma.partner.findFirst({
    where: { organizationName: "KC Interfaith Council" },
  });
  if (!churchOrg) {
    churchOrg = await prisma.partner.create({
      data: {
        orgPeopleFlag: "O",
        organizationName: "KC Interfaith Council",
        organizationTypeId: orgTypeRecords["Faith Tradition"],
        city: "Kansas City",
        state: "MO",
        officeId: mainOffice.id,
      },
    });
  }

  // A partner that is an individual person (not an org)
  let bizPerson = await prisma.partner.findFirst({
    where: { organizationName: "Maria Rodriguez (Individual)" },
  });
  if (!bizPerson) {
    bizPerson = await prisma.partner.create({
      data: {
        orgPeopleFlag: "P",
        organizationName: "Maria Rodriguez (Individual)",
        organizationTypeId: orgTypeRecords["Business"],
        city: "Kansas City",
        state: "MO",
        officeId: mainOffice.id,
      },
    });
  }

  console.log("  Created 3 partners");

  // ─── Partner Roles ───────────────────────────────────────────────────────
  let govRole = await prisma.partnerRole.findFirst({
    where: { partnerId: govOffice.id, roleDescription: "Governor" },
  });
  if (!govRole) {
    govRole = await prisma.partnerRole.create({
      data: {
        partnerId: govOffice.id,
        roleDescription: "Governor",
        peopleId: contactRecords[0],
      },
    });
  }

  let ltGovRole = await prisma.partnerRole.findFirst({
    where: { partnerId: govOffice.id, roleDescription: "Lieutenant Governor" },
  });
  if (!ltGovRole) {
    ltGovRole = await prisma.partnerRole.create({
      data: {
        partnerId: govOffice.id,
        roleDescription: "Lieutenant Governor",
        peopleId: contactRecords[1],
      },
    });
  }

  let faithRole = await prisma.partnerRole.findFirst({
    where: { partnerId: churchOrg.id, roleDescription: "Executive Director" },
  });
  if (!faithRole) {
    faithRole = await prisma.partnerRole.create({
      data: {
        partnerId: churchOrg.id,
        roleDescription: "Executive Director",
        peopleId: contactRecords[2],
      },
    });
  }

  let bizRole = await prisma.partnerRole.findFirst({
    where: { partnerId: bizPerson.id, roleDescription: "Business Contact" },
  });
  if (!bizRole) {
    bizRole = await prisma.partnerRole.create({
      data: {
        partnerId: bizPerson.id,
        roleDescription: "Business Contact",
        peopleId: contactRecords[3],
      },
    });
  }

  console.log("  Created 4 partner roles");

  // ─── Relationships (Connector ↔ Person via PartnerRole) ─────────────────
  const relationships = [
    { peopleId: connectorRecords[0], targetPersonId: contactRecords[0], partnerRoleId: govRole.id, relationshipTypeId: relTypeRecords["Can Text"], lastReviewedDate: new Date("2025-09-15") },
    { peopleId: connectorRecords[0], targetPersonId: contactRecords[2], partnerRoleId: faithRole.id, relationshipTypeId: relTypeRecords["Close Friend"], lastReviewedDate: new Date("2025-11-01") },
    { peopleId: connectorRecords[1], targetPersonId: contactRecords[1], partnerRoleId: ltGovRole.id, relationshipTypeId: relTypeRecords["Professional Contact"] },
    { peopleId: connectorRecords[1], targetPersonId: contactRecords[3], partnerRoleId: bizRole.id, relationshipTypeId: relTypeRecords["Acquaintance"] },
    { peopleId: connectorRecords[2], targetPersonId: contactRecords[0], partnerRoleId: govRole.id, relationshipTypeId: relTypeRecords["Met Once"] },
  ];

  for (const rel of relationships) {
    const existing = await prisma.relationship.findUnique({
      where: { peopleId_targetPersonId: { peopleId: rel.peopleId, targetPersonId: rel.targetPersonId } },
    });
    if (!existing) {
      await prisma.relationship.create({ data: rel });
    }
  }
  console.log("  Created 5 relationships");

  // ─── Connection Log ──────────────────────────────────────────────────────
  const connections = [
    { peopleId: connectorRecords[0], partnerRoleId: govRole.id, connectionDate: new Date("2025-08-20"), notes: "Met at community event; discussed education funding" },
    { peopleId: connectorRecords[0], partnerRoleId: faithRole.id, connectionDate: new Date("2025-10-15"), notes: "Lunch meeting; planning interfaith dialogue" },
    { peopleId: connectorRecords[1], partnerRoleId: ltGovRole.id, connectionDate: new Date("2025-07-10"), notes: "Phone call about workforce development initiative" },
  ];

  const existingConnectionsCount = await prisma.connection.count();
  if (existingConnectionsCount === 0) {
    await prisma.connection.createMany({ data: connections });
  }
  console.log("  Created 3 connection log entries");

  // ─── Happenings ──────────────────────────────────────────────────────────
  let happening1 = await prisma.happening.findFirst({
    where: { happeningDescription: "JCRB|AJC Statement on Community Safety" },
  });
  if (!happening1) {
    happening1 = await prisma.happening.create({
      data: {
        happeningDate: new Date("2025-10-07"),
        happeningDescription: "JCRB|AJC Statement on Community Safety",
      },
    });
  }

  let happening2 = await prisma.happening.findFirst({
    where: { happeningDescription: "Annual Interfaith Thanksgiving Service" },
  });
  if (!happening2) {
    happening2 = await prisma.happening.create({
      data: {
        happeningDate: new Date("2025-11-15"),
        happeningDescription: "Annual Interfaith Thanksgiving Service",
      },
    });
  }

  console.log("  Created 2 happenings");

  // ─── Happening Responses ─────────────────────────────────────────────────
  const existingResponsesCount = await prisma.happeningResponse.count();
  if (existingResponsesCount === 0) {
    await prisma.happeningResponse.createMany({
      data: [
        { peopleId: contactRecords[0], happeningId: happening1.id, responseDate: new Date("2025-10-08"), responseNotes: "Issued supportive public statement", isPublic: true },
        { peopleId: contactRecords[2], happeningId: happening2.id, responseDate: new Date("2025-11-16"), responseNotes: "Attended and gave opening blessing", isPublic: true },
        { peopleId: contactRecords[3], happeningId: happening1.id, responseDate: new Date("2025-10-10"), responseNotes: "Sent private email of support", isPublic: false },
      ],
    });
  }
  console.log("  Created 3 happening responses");

  // ─── Admin User ─────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@jcrb.org";
  const adminPassword = process.env.ADMIN_PASSWORD || generateSecurePassword();
  const isDefaultPassword = !process.env.ADMIN_PASSWORD;

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: "System",
      lastName: "Admin",
      role: "SYSTEM_ADMIN",
      officeId: mainOffice.id,
    },
  });

  if (isDefaultPassword) {
    console.log(`\n  Created admin user:`);
    console.log(`    Email: ${adminEmail}`);
    console.log(`    Password: ${adminPassword}`);
    console.log(`\n  IMPORTANT: Save this password! It will not be shown again.`);
    console.log(`  Set ADMIN_PASSWORD env var to use a specific password.\n`);
  } else {
    console.log(`  Created admin user (${adminEmail})`);
  }

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
