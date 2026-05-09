/**
 * Migration script: convert AnnualEventType + AnnualFundraiserType data into Tags.
 *
 * Run AFTER deploying the schema that adds the new Tag tables but BEFORE
 * deploying the schema that removes the old AET/AFT tables.
 *
 *   npx tsx scripts/migrate-to-tags.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration: AnnualEventTypes + AnnualFundraiserTypes → Tags\n");

  // ── 1. Collect all AET and AFT records ───────────────────────────────────────
  const aetList = await prisma.annualEventType.findMany();
  const aftList = await prisma.annualFundraiserType.findMany();

  console.log(`Found ${aetList.length} AnnualEventTypes`);
  console.log(`Found ${aftList.length} AnnualFundraiserTypes`);

  // ── 2. Build a map of (name, officeId) → Tag.id ──────────────────────────────
  // AET and AFT with the same name in the same office merge into one Tag.
  const tagKeyToId = new Map<string, string>();

  for (const aet of aetList) {
    const key = `${aet.officeId}::${aet.name}`;
    if (!tagKeyToId.has(key)) {
      const tag = await prisma.tag.upsert({
        where: { name_officeId: { name: aet.name, officeId: aet.officeId } },
        update: {},
        create: { name: aet.name, officeId: aet.officeId },
      });
      tagKeyToId.set(key, tag.id);
      console.log(`  Tag created/found: "${aet.name}" (office ${aet.officeId})`);
    }
  }

  for (const aft of aftList) {
    const key = `${aft.officeId}::${aft.name}`;
    if (!tagKeyToId.has(key)) {
      const tag = await prisma.tag.upsert({
        where: { name_officeId: { name: aft.name, officeId: aft.officeId } },
        update: {},
        create: { name: aft.name, officeId: aft.officeId },
      });
      tagKeyToId.set(key, tag.id);
      console.log(`  Tag created/found: "${aft.name}" (office ${aft.officeId})`);
    }
  }

  console.log(`\n${tagKeyToId.size} unique Tags created.\n`);

  // ── 3. Helper to resolve tagId from a type record ────────────────────────────
  function tagIdFor(name: string, officeId: string): string | undefined {
    return tagKeyToId.get(`${officeId}::${name}`);
  }

  // ── 4. Migrate PeopleAnnualEventType → PersonTag ─────────────────────────────
  const paet = await prisma.peopleAnnualEventType.findMany({ include: { annualEventType: true } });
  let personTagCount = 0;
  for (const row of paet) {
    const tagId = tagIdFor(row.annualEventType.name, row.annualEventType.officeId);
    if (!tagId) continue;
    await prisma.personTag.upsert({
      where: { personId_tagId: { personId: row.peopleId, tagId } },
      update: {},
      create: { personId: row.peopleId, tagId },
    });
    personTagCount++;
  }
  console.log(`PersonTag (from AET): ${personTagCount} rows migrated`);

  // ── 5. Migrate PeopleAnnualFundraiserType → PersonTag ────────────────────────
  const paft = await prisma.peopleAnnualFundraiserType.findMany({ include: { annualFundraiserType: true } });
  let personTagFCount = 0;
  for (const row of paft) {
    const tagId = tagIdFor(row.annualFundraiserType.name, row.annualFundraiserType.officeId);
    if (!tagId) continue;
    await prisma.personTag.upsert({
      where: { personId_tagId: { personId: row.peopleId, tagId } },
      update: {},
      create: { personId: row.peopleId, tagId },
    });
    personTagFCount++;
  }
  console.log(`PersonTag (from AFT): ${personTagFCount} rows migrated`);

  // ── 6. Migrate PartnerAnnualEventType → PartnerTag ───────────────────────────
  const partAet = await prisma.partnerAnnualEventType.findMany({
    include: { annualEventType: true, partner: { select: { officeId: true } } },
  });
  let partnerTagCount = 0;
  for (const row of partAet) {
    const tagId = tagIdFor(row.annualEventType.name, row.partner.officeId);
    if (!tagId) continue;
    await prisma.partnerTag.upsert({
      where: { partnerId_tagId: { partnerId: row.partnerId, tagId } },
      update: {},
      create: { partnerId: row.partnerId, tagId },
    });
    partnerTagCount++;
  }
  console.log(`PartnerTag (from AET): ${partnerTagCount} rows migrated`);

  // ── 7. Migrate PartnerAnnualFundraiserType → PartnerTag ──────────────────────
  const partAft = await prisma.partnerAnnualFundraiserType.findMany({
    include: { annualFundraiserType: true, partner: { select: { officeId: true } } },
  });
  let partnerTagFCount = 0;
  for (const row of partAft) {
    const tagId = tagIdFor(row.annualFundraiserType.name, row.partner.officeId);
    if (!tagId) continue;
    await prisma.partnerTag.upsert({
      where: { partnerId_tagId: { partnerId: row.partnerId, tagId } },
      update: {},
      create: { partnerId: row.partnerId, tagId },
    });
    partnerTagFCount++;
  }
  console.log(`PartnerTag (from AFT): ${partnerTagFCount} rows migrated`);

  // ── 8. Migrate PartnerRoleAnnualEventType → PartnerRoleTag ───────────────────
  const prAet = await prisma.partnerRoleAnnualEventType.findMany({
    include: {
      annualEventType: true,
      partnerRole: { select: { partner: { select: { officeId: true } } } },
    },
  });
  let partnerRoleTagCount = 0;
  for (const row of prAet) {
    const tagId = tagIdFor(row.annualEventType.name, row.partnerRole.partner.officeId);
    if (!tagId) continue;
    await prisma.partnerRoleTag.upsert({
      where: { partnerRoleId_tagId: { partnerRoleId: row.partnerRoleId, tagId } },
      update: {},
      create: { partnerRoleId: row.partnerRoleId, tagId },
    });
    partnerRoleTagCount++;
  }
  console.log(`PartnerRoleTag (from AET): ${partnerRoleTagCount} rows migrated`);

  // ── 9. Migrate PartnerRoleAnnualFundraiserType → PartnerRoleTag ──────────────
  const prAft = await prisma.partnerRoleAnnualFundraiserType.findMany({
    include: {
      annualFundraiserType: true,
      partnerRole: { select: { partner: { select: { officeId: true } } } },
    },
  });
  let partnerRoleTagFCount = 0;
  for (const row of prAft) {
    const tagId = tagIdFor(row.annualFundraiserType.name, row.partnerRole.partner.officeId);
    if (!tagId) continue;
    await prisma.partnerRoleTag.upsert({
      where: { partnerRoleId_tagId: { partnerRoleId: row.partnerRoleId, tagId } },
      update: {},
      create: { partnerRoleId: row.partnerRoleId, tagId },
    });
    partnerRoleTagFCount++;
  }
  console.log(`PartnerRoleTag (from AFT): ${partnerRoleTagFCount} rows migrated`);

  console.log("\nMigration complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
