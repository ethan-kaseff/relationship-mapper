import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { validateBody, createAnnualFundraiserTypeSchema } from "@/lib/validations";
import { getOfficeFilter } from "@/lib/office-filter";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const officeFilter = await getOfficeFilter();
    const types = await prisma.annualFundraiserType.findMany({
      where: officeFilter,
      orderBy: { name: "asc" },
      include: {
        office: { select: { name: true } },
        _count: {
          select: {
            peopleAnnualFundraiserTypes: true,
            partnerAnnualFundraiserTypes: true,
            partnerRoleAnnualFundraiserTypes: true,
          },
        },
      },
    });
    return NextResponse.json(types);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createAnnualFundraiserTypeSchema);
  if (!validation.success) return validation.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const type = await prisma.annualFundraiserType.create({
      data: { name: validation.data.name, officeId },
    });
    return NextResponse.json(type, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
