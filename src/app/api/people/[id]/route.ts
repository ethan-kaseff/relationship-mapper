import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updatePeopleSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";

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
        annualEventTypes: {
          include: { annualEventType: true },
        },
        annualFundraiserTypes: {
          include: { annualFundraiserType: true },
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
        email1: data.email1 || null,
        email2: data.email2 || null,
        isConnector: data.isConnector,
      },
    });

    // Handle annual event type associations
    if (data.annualEventTypeIds !== undefined) {
      await prisma.peopleAnnualEventType.deleteMany({ where: { peopleId: id } });
      if (data.annualEventTypeIds.length > 0) {
        await prisma.peopleAnnualEventType.createMany({
          data: data.annualEventTypeIds.map((typeId) => ({
            peopleId: id,
            annualEventTypeId: typeId,
          })),
        });
      }
    }

    // Handle annual fundraiser type associations
    if (data.annualFundraiserTypeIds !== undefined) {
      await prisma.peopleAnnualFundraiserType.deleteMany({ where: { peopleId: id } });
      if (data.annualFundraiserTypeIds.length > 0) {
        await prisma.peopleAnnualFundraiserType.createMany({
          data: data.annualFundraiserTypeIds.map((typeId) => ({
            peopleId: id,
            annualFundraiserTypeId: typeId,
          })),
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
