import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNonViewer } from "@/lib/api-auth";
import { validateBody, createConnectionSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const officeFilter = await getOfficeFilterFromRequest(request);
    const personFilter = officeFilter.officeId
      ? { person: { officeId: officeFilter.officeId } }
      : {};
    const connections = await prisma.connection.findMany({
      where: personFilter,
      include: {
        person: true,
        partnerRole: {
          include: {
            partner: true,
          },
        },
      },
    });
    return NextResponse.json(connections);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonViewer();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createConnectionSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;
    const connection = await prisma.connection.create({
      data: {
        peopleId: data.peopleId,
        partnerRoleId: data.partnerRoleId,
        connectionDate: new Date(data.connectionDate),
        connectionTime: data.connectionTime,
        notes: data.notes,
      },
    });
    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
