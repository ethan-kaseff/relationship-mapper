import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, badRequest, notFound } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

const schema = z.object({ tagId: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, schema);
  if (!validation.success) return validation.response;

  try {
    const { id: eventId } = await params;
    const { tagId } = validation.data;
    const officeFilter = await getOfficeFilter();
    const officeId = (officeFilter as { officeId?: string }).officeId;

    const tag = await prisma.tag.findFirst({ where: { id: tagId, ...officeFilter } });
    if (!tag) return notFound("Tag not found");

    // Collect ACTIVE people from all three tag association types, deduped
    const peopleIdSet = new Set<string>();

    // 1. Directly tagged people
    const personTags = await prisma.personTag.findMany({
      where: { tagId, person: { status: "ACTIVE", ...(officeId ? { officeId } : {}) } },
      select: { personId: true },
    });
    for (const pt of personTags) peopleIdSet.add(pt.personId);

    // 2. People via partner roles tagged with this tag
    const partnerRoleTags = await prisma.partnerRoleTag.findMany({
      where: {
        tagId,
        partnerRole: {
          peopleId: { not: null },
          person: { status: "ACTIVE" },
          partner: officeId ? { officeId } : {},
        },
      },
      select: { partnerRole: { select: { peopleId: true } } },
    });
    for (const prt of partnerRoleTags) {
      if (prt.partnerRole.peopleId) peopleIdSet.add(prt.partnerRole.peopleId);
    }

    // 3. People via partner-level tags (partner with no roles — look up by name)
    const partnerTags = await prisma.partnerTag.findMany({
      where: {
        tagId,
        partner: officeId ? { officeId } : {},
      },
      select: {
        partner: {
          select: {
            organizationName: true,
            officeId: true,
            partnerRoles: {
              where: { peopleId: { not: null }, person: { status: "ACTIVE" } },
              select: { peopleId: true },
              take: 1,
            },
          },
        },
      },
    });
    for (const partnerTag of partnerTags) {
      const p = partnerTag.partner;
      if (p.partnerRoles.length > 0 && p.partnerRoles[0].peopleId) {
        peopleIdSet.add(p.partnerRoles[0].peopleId);
      } else if (p.organizationName) {
        const nameParts = p.organizationName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        if (firstName && lastName) {
          const person = await prisma.people.findFirst({
            where: { firstName, lastName, officeId: p.officeId, status: "ACTIVE" },
            select: { id: true },
          });
          if (person) peopleIdSet.add(person.id);
        }
      }
    }

    if (peopleIdSet.size === 0) {
      return badRequest("No active people found for this tag");
    }

    // Skip already-invited people
    const existing = await prisma.eventInvite.findMany({
      where: { eventId, peopleId: { in: Array.from(peopleIdSet) } },
      select: { peopleId: true },
    });
    const existingIds = new Set(existing.map((e) => e.peopleId));
    const newIds = Array.from(peopleIdSet).filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      return NextResponse.json({ created: 0, skipped: existingIds.size });
    }

    const result = await prisma.eventInvite.createMany({
      data: newIds.map((peopleId) => ({ eventId, peopleId, group: tag.name })),
      skipDuplicates: true,
    });

    return NextResponse.json({ created: result.count, skipped: existingIds.size }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
