import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updatePeopleSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const person = await prisma.people.findUnique({
      where: { id },
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
    const person = await prisma.people.update({
      where: { id },
      data: {
        firstName: data.firstName,
        middleInitial: data.middleInitial !== undefined ? (data.middleInitial || null) : undefined,
        lastName: data.lastName,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        phoneNumber: data.phoneNumber,
        personalEmail: data.personalEmail || null,
        isConnector: data.isConnector,
        annualInvite: data.annualInvite,
      },
    });
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
