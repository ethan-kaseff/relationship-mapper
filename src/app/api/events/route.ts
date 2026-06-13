import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
    let seatingLayout: Prisma.InputJsonValue | undefined = undefined;
    if (data.templateEventId) {
      const templateEvent = await prisma.event.findUnique({
        where: { id: data.templateEventId },
        select: { seatingLayout: true },
      });
      if (templateEvent?.seatingLayout) {
        // Copy the room/tables/objects but strip any guests embedded in the
        // template's seats — the new event starts with an empty layout.
        const tpl = templateEvent.seatingLayout as { tables?: { seats?: unknown[] }[] };
        if (tpl && Array.isArray(tpl.tables)) {
          tpl.tables = tpl.tables.map((t) => ({
            ...t,
            seats: Array.isArray(t.seats) ? t.seats.map(() => ({ guestId: null })) : t.seats,
          }));
        }
        seatingLayout = tpl as unknown as Prisma.InputJsonValue;
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
        ticketPrice: data.ticketPrice ?? null,
        mealCost: data.mealCost ?? null,
        seatingLayout: seatingLayout ?? undefined,
        createdById: authResult.session.user.id,
        officeId,
      },
    });

    // Auto-invite people tagged with the selected tag
    if (data.tagId) {
      const tagId = data.tagId;
      const peopleGroupMap = new Map<string, string>();

      // From partner roles tagged with this tag
      const roleTags = await prisma.partnerRoleTag.findMany({
        where: {
          tagId,
          partnerRole: {
            peopleId: { not: null },
            partner: { officeId },
            person: { status: "ACTIVE" },
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
      for (const r of roleTags) {
        const pid = r.partnerRole.peopleId!;
        if (!peopleGroupMap.has(pid)) {
          peopleGroupMap.set(pid, r.partnerRole.partner.organizationName || "");
        }
      }

      // From partners tagged with this tag
      const partnerTags = await prisma.partnerTag.findMany({
        where: { tagId, partner: { officeId } },
        include: {
          partner: {
            include: {
              partnerRoles: {
                where: { peopleId: { not: null }, person: { status: "ACTIVE" } },
                select: { peopleId: true },
                take: 1,
              },
            },
          },
        },
      });
      for (const pt of partnerTags) {
        const group = pt.partner.organizationName || "";
        if (pt.partner.partnerRoles.length > 0) {
          const pid = pt.partner.partnerRoles[0].peopleId!;
          if (!peopleGroupMap.has(pid)) peopleGroupMap.set(pid, group);
        } else if (pt.partner.organizationName) {
          const nameParts = pt.partner.organizationName.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          if (firstName && lastName) {
            const person = await prisma.people.findFirst({
              where: { firstName, lastName, officeId, status: "ACTIVE" },
              select: { id: true },
            });
            if (person && !peopleGroupMap.has(person.id)) {
              peopleGroupMap.set(person.id, group);
            }
          }
        }
      }

      // From people directly tagged
      const personTags = await prisma.personTag.findMany({
        where: { tagId, person: { officeId, status: "ACTIVE" } },
        select: { personId: true },
      });
      for (const p of personTags) {
        if (!peopleGroupMap.has(p.personId)) peopleGroupMap.set(p.personId, "");
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
