import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createPeopleSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";

export async function GET(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeFilter = await getOfficeFilterFromRequest(request);
    const people = await prisma.people.findMany({
      where: officeFilter,
      include: {
        partnerRoles: {
          include: {
            partner: true,
          },
        },
        relationships: true,
        connections: true,
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

    const person = await prisma.people.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        phoneNumber: data.phoneNumber,
        personalEmail: data.personalEmail || null,
        isConnector: data.isConnector ?? false,
        officeId,
      },
    });
    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
