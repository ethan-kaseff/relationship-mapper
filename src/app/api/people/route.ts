import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createPeopleSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const officeFilter = await getOfficeFilterFromRequest(request);

    if (search) {
      const people = await prisma.people.findMany({
        where: {
          ...officeFilter,
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email1: { contains: search, mode: "insensitive" } },
            { email2: { contains: search, mode: "insensitive" } },
          ],
        },
        select: {
          id: true, firstName: true, middleInitial: true, lastName: true,
          prefix: true, greeting: true, address: true, city: true, state: true,
          zip: true, phoneNumber: true, email1: true, email2: true,
          status: true, isConnector: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 20,
      });
      return NextResponse.json({ people });
    }

    const people = await prisma.people.findMany({
      where: officeFilter,
      include: {
        partnerRoles: { include: { partner: true } },
        relationships: true,
        connections: true,
        tags: { select: { tagId: true } },
      },
    });
    return NextResponse.json(people);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createPeopleSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;

    // System admins can specify officeId; others get their own
    const officeId =
      authResult.session.user.role === "SYSTEM_ADMIN" && data.officeId
        ? data.officeId
        : authResult.session.user.officeId;

    // Check for duplicate name within the same office
    const existing = await prisma.people.findFirst({
      where: {
        prefix: data.prefix || null,
        firstName: data.firstName,
        middleInitial: data.middleInitial || null,
        lastName: data.lastName,
        officeId,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A person named "${[data.prefix, data.firstName, data.middleInitial, data.lastName].filter(Boolean).join(" ")}" already exists in this office.` },
        { status: 409 }
      );
    }

    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;

    const person = await prisma.people.create({
      data: {
        firstName: data.firstName,
        middleInitial: data.middleInitial || null,
        lastName: data.lastName,
        prefix: data.prefix || null,
        greeting: data.greeting || null,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        phoneNumber: data.phoneNumber,
        email1: data.email1 || null,
        email2: data.email2 || null,
        isConnector: data.isConnector ?? false,
        status: data.status ?? "ACTIVE",
        assignedToId: data.status === "PROSPECT" ? (data.assignedToId || null) : null,
        assignedDate: data.status === "PROSPECT" && data.assignedToId ? new Date() : null,
        emailTemplateId: data.status === "PROSPECT" ? (data.emailTemplateId || null) : null,
        officeId,
      },
      include: { assignedTo: { select: { firstName: true, lastName: true } } },
    });

    if (data.status === "PROSPECT" && userId) {
      const assigneeName = person.assignedTo
        ? `${person.assignedTo.firstName} ${person.assignedTo.lastName}`
        : null;
      await prisma.personNote.create({
        data: {
          content: `Added as prospect${assigneeName ? ` and assigned to ${assigneeName}` : ""}.`,
          peopleId: person.id,
          authorId: userId,
        },
      });
    }

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
