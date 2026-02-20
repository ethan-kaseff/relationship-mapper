import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createPartnerRoleSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const partnerRoles = await prisma.partnerRole.findMany({
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
    return NextResponse.json(partnerRole, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
