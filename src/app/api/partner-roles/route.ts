import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createPartnerRoleSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";

export async function GET(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeFilter = await getOfficeFilterFromRequest(request);
    const partnerRoles = await prisma.partnerRole.findMany({
      where: {
        partner: officeFilter,
      },
      include: {
        partner: true,
        person: true,
      },
    });
    return NextResponse.json(partnerRoles);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createPartnerRoleSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;
    const partnerRole = await prisma.partnerRole.create({
      data: {
        partnerId: data.partnerId,
        roleDescription: data.roleDescription,
        peopleId: data.peopleId,
      },
    });

    // Create annual event type associations
    if (data.annualEventTypeIds && data.annualEventTypeIds.length > 0) {
      await prisma.partnerRoleAnnualEventType.createMany({
        data: data.annualEventTypeIds.map((typeId) => ({
          partnerRoleId: partnerRole.id,
          annualEventTypeId: typeId,
        })),
      });
    }

    // Create a RoleAssignment record when a person is assigned during role creation
    if (data.peopleId) {
      await prisma.roleAssignment.create({
        data: {
          partnerRoleId: partnerRole.id,
          peopleId: data.peopleId,
          startDate: data.startDate ? new Date(data.startDate) : null,
        },
      });
    }

    return NextResponse.json(partnerRole, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
