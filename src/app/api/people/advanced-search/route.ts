import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";
import { Prisma, PeopleStatus } from "@prisma/client";

type FilterRow = {
  id: string;
  category: string;
  operator: string;
  value: Record<string, unknown>;
  connector: "AND" | "OR";
};

function buildOrGroups(filters: FilterRow[]): FilterRow[][] {
  if (!filters.length) return [];
  const groups: FilterRow[][] = [];
  let current: FilterRow[] = [];
  for (let i = 0; i < filters.length; i++) {
    current.push(filters[i]);
    if (i < filters.length - 1 && filters[i].connector === "OR") {
      groups.push(current);
      current = [];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

async function buildCondition(
  filter: FilterRow
): Promise<Prisma.PeopleWhereInput | null> {
  const { category, operator, value } = filter;

  switch (category) {
    case "status": {
      const statuses = (value.statuses as string[]) ?? [];
      if (!statuses.length) return null;
      return { status: { in: statuses as PeopleStatus[] } };
    }

    case "tags": {
      if (operator === "has_any_tag") return { tags: { some: {} } };
      if (operator === "has_no_tags") return { tags: { none: {} } };
      const tagIds = (value.tagIds as string[]) ?? [];
      if (!tagIds.length) return null;
      if (operator === "has_any_of") return { tags: { some: { tagId: { in: tagIds } } } };
      if (operator === "has_all_of")
        return { AND: tagIds.map((id) => ({ tags: { some: { tagId: id } } })) };
      if (operator === "has_none_of") return { tags: { none: { tagId: { in: tagIds } } } };
      return null;
    }

    case "notes": {
      if (operator === "has_any") return { personNotes: { some: {} } };
      if (operator === "has_none") return { personNotes: { none: {} } };
      if (operator === "contains_text") {
        const keyword = (value.keyword as string) ?? "";
        if (!keyword.trim()) return null;
        return { personNotes: { some: { content: { contains: keyword, mode: "insensitive" } } } };
      }
      if (operator === "written_by") {
        const authorId = value.authorId as string;
        if (!authorId) return null;
        return { personNotes: { some: { authorId } } };
      }
      if (operator === "written_between") {
        const dateFrom = value.dateFrom as string;
        const dateTo = value.dateTo as string;
        if (!dateFrom && !dateTo) return null;
        return {
          personNotes: {
            some: {
              createdAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
              },
            },
          },
        };
      }
      return null;
    }

    case "events": {
      if (operator === "never_invited") return { eventInvites: { none: {} } };
      if (operator === "invited_in_date_range") {
        const dateFrom = value.dateFrom as string;
        const dateTo = value.dateTo as string;
        if (!dateFrom && !dateTo) return null;
        return {
          eventInvites: {
            some: {
              event: {
                eventDate: {
                  ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                  ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
                },
              },
            },
          },
        };
      }
      const eventId = value.eventId as string;
      if (!eventId) return null;
      if (operator === "attended") return { eventInvites: { some: { eventId, attended: true } } };
      if (operator === "invited_with_rsvp") {
        const rsvpStatus = value.rsvpStatus as string;
        return {
          eventInvites: {
            some: {
              eventId,
              ...(rsvpStatus && rsvpStatus !== "ANY" ? { rsvpStatus } : {}),
            },
          },
        };
      }
      return null;
    }

    case "fundraisers": {
      if (operator === "any_solicitation") return { solicitations: { some: {} } };
      if (operator === "never_solicited") return { solicitations: { none: {} } };
      if (operator === "solicited_for") {
        const fundraiserId = value.fundraiserId as string;
        if (!fundraiserId) return null;
        const solicitationStatus = value.solicitationStatus as string;
        return {
          solicitations: {
            some: {
              fundraiserId,
              ...(solicitationStatus && solicitationStatus !== "ANY"
                ? { status: solicitationStatus }
                : {}),
            },
          },
        };
      }
      return null;
    }

    case "giving": {
      if (operator === "has_donated") return { donations: { some: {} } };
      if (operator === "never_donated") return { donations: { none: {} } };
      if (operator === "is_recurring") return { donations: { some: { isRecurring: true } } };
      if (operator === "donated_to") {
        const fundraiserId = value.fundraiserId as string;
        if (!fundraiserId) return null;
        return { donations: { some: { fundraiserId } } };
      }
      if (operator === "single_gift_at_least") {
        const amt = value.amount as number;
        if (!amt) return null;
        return { donations: { some: { amount: { gte: Math.round(amt * 100) } } } };
      }
      if (operator === "single_gift_at_most") {
        const amt = value.amount as number;
        if (!amt) return null;
        return { donations: { some: { amount: { lte: Math.round(amt * 100) } } } };
      }
      if (operator === "donated_between") {
        const dateFrom = value.dateFrom as string;
        const dateTo = value.dateTo as string;
        if (!dateFrom && !dateTo) return null;
        return {
          donations: {
            some: {
              donatedAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
              },
            },
          },
        };
      }
      if (operator === "total_giving_at_least" || operator === "total_giving_at_most") {
        const amt = value.amount as number;
        if (!amt) return null;
        const amountCents = Math.round(amt * 100);
        const aggregates = await prisma.donation.groupBy({
          by: ["peopleId"],
          _sum: { amount: true },
          having:
            operator === "total_giving_at_least"
              ? { amount: { _sum: { gte: amountCents } } }
              : { amount: { _sum: { lte: amountCents } } },
          where: { peopleId: { not: null } },
        });
        const peopleIds = aggregates
          .map((a) => a.peopleId)
          .filter(Boolean) as string[];
        return { id: { in: peopleIds } };
      }
      return null;
    }

    default:
      return null;
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;
  try {
    const officeFilter = await getOfficeFilter();
    const body = await request.json();
    const filters: FilterRow[] = (body.filters ?? []).filter(
      (f: FilterRow) => f.category && f.operator
    );

    if (!filters.length) return NextResponse.json([]);

    const conditionMap = new Map<string, Prisma.PeopleWhereInput | null>();
    await Promise.all(
      filters.map(async (f) => {
        conditionMap.set(f.id, await buildCondition(f));
      })
    );

    const orGroups = buildOrGroups(filters);
    const groupWhereClauses: Prisma.PeopleWhereInput[] = [];

    for (const group of orGroups) {
      const groupConditions: Prisma.PeopleWhereInput[] = group
        .map((f) => conditionMap.get(f.id))
        .filter((c): c is Prisma.PeopleWhereInput => c !== null);
      if (groupConditions.length > 0) {
        groupWhereClauses.push(
          groupConditions.length === 1
            ? groupConditions[0]
            : { AND: groupConditions }
        );
      }
    }

    const filterWhere: Prisma.PeopleWhereInput =
      groupWhereClauses.length === 0
        ? {}
        : groupWhereClauses.length === 1
        ? groupWhereClauses[0]
        : { OR: groupWhereClauses };

    const people = await prisma.people.findMany({
      where: { ...officeFilter, ...filterWhere },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        city: true,
        state: true,
        email1: true,
        email2: true,
        phoneNumber: true,
        tags: { select: { tag: { select: { id: true, name: true } } } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
    });

    return NextResponse.json(people);
  } catch (error) {
    return handleApiError(error);
  }
}
