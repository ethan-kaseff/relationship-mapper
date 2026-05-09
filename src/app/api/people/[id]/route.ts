import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updatePeopleSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const officeFilter = await getOfficeFilter();
    const person = await prisma.people.findFirst({
      where: { id, ...officeFilter },
      include: {
        partnerRoles: {
          include: {
            partner: true,
          },
        },
        relationships: {
          include: {
            targetPerson: true,
            partnerRole: {
              include: {
                partner: true,
              },
            },
            relationshipType: true,
          },
        },
        connections: {
          include: {
            partnerRole: {
              include: {
                partner: true,
              },
            },
          },
        },
        happeningResponses: {
          include: {
            happening: true,
          },
        },
        tags: {
          include: { tag: true },
        },
      },
    });
    if (!person) {
      return notFound("Person not found");
    }
    return NextResponse.json(person);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updatePeopleSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;

    // Read previous status to detect prospect assignment
    const previous = data.status !== undefined
      ? await prisma.people.findUnique({ where: { id }, select: { status: true, assignedToId: true } })
      : null;

    const person = await prisma.people.update({
      where: { id },
      data: {
        firstName: data.firstName,
        middleInitial: data.middleInitial !== undefined ? (data.middleInitial || null) : undefined,
        lastName: data.lastName,
        prefix: data.prefix !== undefined ? (data.prefix || null) : undefined,
        greeting: data.greeting !== undefined ? (data.greeting || null) : undefined,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        phoneNumber: data.phoneNumber,
        email1: data.email1 || null,
        email2: data.email2 || null,
        isConnector: data.isConnector,
        status: data.status,
        deceasedDate: data.status === "DECEASED"
          ? (data.deceasedDate ? new Date(data.deceasedDate) : undefined)
          : data.status !== undefined ? null : undefined,
        forwardingEmail: data.status === "DECEASED" ? (data.forwardingEmail || null) : data.status !== undefined ? null : undefined,
        assignedToId: data.assignedToId !== undefined ? (data.assignedToId || null) : undefined,
        assignedDate: data.assignedDate ? new Date(data.assignedDate) : data.assignedToId !== undefined ? null : undefined,
        emailTemplateId: data.emailTemplateId !== undefined ? (data.emailTemplateId || null) : undefined,
      },
      include: { assignedTo: { select: { firstName: true, lastName: true } } },
    });

    // Auto-create a note when a person is newly assigned as a prospect
    const becomingProspect = data.status === "PROSPECT" && previous?.status !== "PROSPECT";
    const newAssignment = data.assignedToId && data.assignedToId !== previous?.assignedToId;
    if ((becomingProspect || newAssignment) && userId) {
      const assignedTo = person.assignedTo;
      const assigneeName = assignedTo ? `${assignedTo.firstName} ${assignedTo.lastName}` : "Unassigned";
      const noteText = becomingProspect
        ? `Marked as prospect${assignedTo ? ` and assigned to ${assigneeName}` : ""}.`
        : `Reassigned to ${assigneeName}.`;
      await prisma.personNote.create({
        data: { content: noteText, peopleId: id, authorId: userId },
      });
    }

    // Handle tag associations
    if (data.tagIds !== undefined) {
      await prisma.personTag.deleteMany({ where: { personId: id } });
      if (data.tagIds.length > 0) {
        await prisma.personTag.createMany({
          data: data.tagIds.map((tagId) => ({ personId: id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json(person);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;

    // Delete related records first (no cascade in schema)
    await prisma.happeningResponse.deleteMany({ where: { peopleId: id } });
    await prisma.connection.deleteMany({ where: { peopleId: id } });
    await prisma.relationship.deleteMany({ where: { peopleId: id } });
    await prisma.relationship.deleteMany({ where: { targetPersonId: id } });
    // Unlink from partner roles (don't delete the roles themselves)
    await prisma.partnerRole.updateMany({
      where: { peopleId: id },
      data: { peopleId: null },
    });

    await prisma.people.delete({ where: { id } });
    return NextResponse.json({ message: "Person deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
