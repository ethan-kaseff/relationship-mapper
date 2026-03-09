import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createEventSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeFilter = await getOfficeFilter();
    const events = await prisma.event.findMany({
      where: officeFilter,
      include: {
        _count: { select: { invites: true } },
        invites: {
          select: { rsvpStatus: true },
        },
      },
      orderBy: { eventDate: "desc" },
    });

    const result = events.map((e) => {
      const yesCount = e.invites.filter((i) => i.rsvpStatus === "YES").length;
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        eventDate: e.eventDate,
        eventTime: e.eventTime,
        location: e.location,
        inviteCount: e._count.invites,
        yesCount,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createEventSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;

    // Copy seating layout from template event if specified
    let seatingLayout = undefined;
    if (data.templateEventId) {
      const templateEvent = await prisma.event.findUnique({
        where: { id: data.templateEventId },
        select: { seatingLayout: true },
      });
      if (templateEvent?.seatingLayout) {
        seatingLayout = templateEvent.seatingLayout;
      }
    }

    const officeId = (authResult.session.user as { officeId: string }).officeId;

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
        eventTime: data.eventTime,
        location: data.location,
        seatingLayout: seatingLayout ?? undefined,
        createdById: authResult.session.user.id,
        officeId,
      },
    });

    // Auto-invite people from annual-invite-flagged roles and partners
    if (data.isAnnualEvent) {
      const allPeopleIds: string[] = [];

      // From Organization partner roles flagged as annual invite
      const roles = await prisma.partnerRole.findMany({
        where: {
          annualInvite: true,
          peopleId: { not: null },
          partner: { officeId },
        },
        select: { peopleId: true },
      });
      allPeopleIds.push(...roles.map((r) => r.peopleId!));

      // From Person partners flagged as annual invite
      const personPartners = await prisma.partner.findMany({
        where: { officeId, orgPeopleFlag: "P", annualInvite: true },
        include: {
          partnerRoles: {
            where: { peopleId: { not: null } },
            select: { peopleId: true },
            take: 1,
          },
        },
      });

      for (const pp of personPartners) {
        if (pp.partnerRoles.length > 0) {
          // Has a PartnerRole linking to a People record
          allPeopleIds.push(pp.partnerRoles[0].peopleId!);
        } else if (pp.organizationName) {
          // No PartnerRole — match People by name in same office
          const nameParts = pp.organizationName.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          if (firstName && lastName) {
            const person = await prisma.people.findFirst({
              where: { firstName, lastName, officeId },
              select: { id: true },
            });
            if (person) allPeopleIds.push(person.id);
          }
        }
      }

      // From People directly flagged as annual invite
      const annualPeople = await prisma.people.findMany({
        where: { officeId, annualInvite: true },
        select: { id: true },
      });
      allPeopleIds.push(...annualPeople.map((p) => p.id));

      const uniquePeopleIds = [...new Set(allPeopleIds)];

      if (uniquePeopleIds.length > 0) {
        await prisma.eventInvite.createMany({
          data: uniquePeopleIds.map((peopleId) => ({
            eventId: event.id,
            peopleId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
