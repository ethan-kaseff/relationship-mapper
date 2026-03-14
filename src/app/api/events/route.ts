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
        trackSeating: data.trackSeating ?? true,
        trackMeals: data.trackMeals ?? true,
        seatingLayout: seatingLayout ?? undefined,
        createdById: authResult.session.user.id,
        officeId,
      },
    });

    // Auto-invite people flagged for this specific annual event type
    if (data.annualEventTypeId) {
      const typeId = data.annualEventTypeId;
      // Track peopleId -> group (partner name), first entry wins
      const peopleGroupMap = new Map<string, string>();

      // From partner roles flagged for this annual event type
      const roles = await prisma.partnerRoleAnnualEventType.findMany({
        where: {
          annualEventTypeId: typeId,
          partnerRole: {
            peopleId: { not: null },
            partner: { officeId },
          },
        },
        select: {
          partnerRole: {
            select: {
              peopleId: true,
              partner: { select: { organizationName: true } },
            },
          },
        },
      });
      for (const r of roles) {
        const pid = r.partnerRole.peopleId!;
        if (!peopleGroupMap.has(pid)) {
          peopleGroupMap.set(pid, r.partnerRole.partner.organizationName || "");
        }
      }

      // From Person partners flagged for this annual event type
      const partnerJoins = await prisma.partnerAnnualEventType.findMany({
        where: {
          annualEventTypeId: typeId,
          partner: { officeId, orgPeopleFlag: "P" },
        },
        include: {
          partner: {
            include: {
              partnerRoles: {
                where: { peopleId: { not: null } },
                select: { peopleId: true },
                take: 1,
              },
            },
          },
        },
      });

      for (const pj of partnerJoins) {
        const group = pj.partner.organizationName || "";
        if (pj.partner.partnerRoles.length > 0) {
          const pid = pj.partner.partnerRoles[0].peopleId!;
          if (!peopleGroupMap.has(pid)) {
            peopleGroupMap.set(pid, group);
          }
        } else if (pj.partner.organizationName) {
          const nameParts = pj.partner.organizationName.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          if (firstName && lastName) {
            const person = await prisma.people.findFirst({
              where: { firstName, lastName, officeId },
              select: { id: true },
            });
            if (person && !peopleGroupMap.has(person.id)) {
              peopleGroupMap.set(person.id, group);
            }
          }
        }
      }

      // From People directly flagged for this annual event type
      const peopleJoins = await prisma.peopleAnnualEventType.findMany({
        where: {
          annualEventTypeId: typeId,
          person: { officeId },
        },
        select: { peopleId: true },
      });
      for (const p of peopleJoins) {
        if (!peopleGroupMap.has(p.peopleId)) {
          peopleGroupMap.set(p.peopleId, "");
        }
      }

      if (peopleGroupMap.size > 0) {
        await prisma.eventInvite.createMany({
          data: Array.from(peopleGroupMap.entries()).map(([peopleId, group]) => ({
            eventId: event.id,
            peopleId,
            group,
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
