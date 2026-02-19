import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
    const r = await prisma.relationshipType.create({
      data: { relationshipDesc: rt.desc, notes: rt.notes },
    });
    relTypeRecords[rt.desc] = r.id;
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
    const p = await prisma.people.create({
      data: { ...c, isConnector: true, officeId: mainOffice.id },
    });
    connectorRecords.push(p.id);
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
    const p = await prisma.people.create({
      data: { ...c, isConnector: false, officeId: mainOffice.id },
    });
    contactRecords.push(p.id);
  }
  console.log(`  Created ${contacts.length} partner contacts`);

  // ─── Sample Partners (Organizations) ─────────────────────────────────────
  const govOffice = await prisma.partner.create({
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

  const churchOrg = await prisma.partner.create({
    data: {
      orgPeopleFlag: "O",
      organizationName: "KC Interfaith Council",
      organizationTypeId: orgTypeRecords["Faith Tradition"],
      city: "Kansas City",
      state: "MO",
      officeId: mainOffice.id,
    },
  });

  // A partner that is an individual person (not an org)
  const bizPerson = await prisma.partner.create({
    data: {
      orgPeopleFlag: "P",
      organizationName: "Maria Rodriguez (Individual)",
      organizationTypeId: orgTypeRecords["Business"],
      city: "Kansas City",
      state: "MO",
      officeId: mainOffice.id,
    },
  });

  console.log("  Created 3 partners");

  // ─── Partner Roles ───────────────────────────────────────────────────────
  const govRole = await prisma.partnerRole.create({
    data: {
      partnerId: govOffice.id,
      roleDescription: "Governor",
      peopleId: contactRecords[0], // Laura Kelly
    },
  });

  const ltGovRole = await prisma.partnerRole.create({
    data: {
      partnerId: govOffice.id,
      roleDescription: "Lieutenant Governor",
      peopleId: contactRecords[1], // David Toland
    },
  });

  const faithRole = await prisma.partnerRole.create({
    data: {
      partnerId: churchOrg.id,
      roleDescription: "Executive Director",
      peopleId: contactRecords[2], // Rev. James Mitchell
    },
  });

  const bizRole = await prisma.partnerRole.create({
    data: {
      partnerId: bizPerson.id,
      roleDescription: "Business Contact",
      peopleId: contactRecords[3], // Maria Rodriguez
    },
  });

  console.log("  Created 4 partner roles");

  // ─── Relationships (Connector ↔ PartnerRole) ────────────────────────────
  await prisma.relationship.createMany({
    data: [
      { peopleId: connectorRecords[0], partnerRoleId: govRole.id, relationshipTypeId: relTypeRecords["Can Text"], lastReviewedDate: new Date("2025-09-15") },
      { peopleId: connectorRecords[0], partnerRoleId: faithRole.id, relationshipTypeId: relTypeRecords["Close Friend"], lastReviewedDate: new Date("2025-11-01") },
      { peopleId: connectorRecords[1], partnerRoleId: ltGovRole.id, relationshipTypeId: relTypeRecords["Professional Contact"] },
      { peopleId: connectorRecords[1], partnerRoleId: bizRole.id, relationshipTypeId: relTypeRecords["Acquaintance"] },
      { peopleId: connectorRecords[2], partnerRoleId: govRole.id, relationshipTypeId: relTypeRecords["Met Once"] },
    ],
  });
  console.log("  Created 5 relationships");

  // ─── Connection Log ──────────────────────────────────────────────────────
  await prisma.connection.createMany({
    data: [
      { peopleId: connectorRecords[0], partnerRoleId: govRole.id, connectionDate: new Date("2025-08-20"), notes: "Met at community event; discussed education funding" },
      { peopleId: connectorRecords[0], partnerRoleId: faithRole.id, connectionDate: new Date("2025-10-15"), notes: "Lunch meeting; planning interfaith dialogue" },
      { peopleId: connectorRecords[1], partnerRoleId: ltGovRole.id, connectionDate: new Date("2025-07-10"), notes: "Phone call about workforce development initiative" },
    ],
  });
  console.log("  Created 3 connection log entries");

  // ─── Events ──────────────────────────────────────────────────────────────
  const event1 = await prisma.event.create({
    data: {
      eventDate: new Date("2025-10-07"),
      eventDescription: "JCRB|AJC Statement on Community Safety",
    },
  });

  const event2 = await prisma.event.create({
    data: {
      eventDate: new Date("2025-11-15"),
      eventDescription: "Annual Interfaith Thanksgiving Service",
    },
  });

  console.log("  Created 2 events");

  // ─── Event Responses ─────────────────────────────────────────────────────
  await prisma.eventResponse.createMany({
    data: [
      { peopleId: contactRecords[0], eventId: event1.id, responseDate: new Date("2025-10-08"), responseNotes: "Issued supportive public statement", isPublic: true },
      { peopleId: contactRecords[2], eventId: event2.id, responseDate: new Date("2025-11-16"), responseNotes: "Attended and gave opening blessing", isPublic: true },
      { peopleId: contactRecords[3], eventId: event1.id, responseDate: new Date("2025-10-10"), responseNotes: "Sent private email of support", isPublic: false },
    ],
  });
  console.log("  Created 3 event responses");

  // ─── Default Admin User ─────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@jcrb.org" },
    update: {},
    create: {
      email: "admin@jcrb.org",
      password: hashedPassword,
      firstName: "System",
      lastName: "Admin",
      role: "SYSTEM_ADMIN",
      officeId: mainOffice.id,
    },
  });
  console.log("  Created default admin user (admin@jcrb.org)");

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
