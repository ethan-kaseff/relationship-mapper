import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createTagSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeFilter = await getOfficeFilter();
    const tags = await prisma.tag.findMany({
      where: officeFilter,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { personTags: true, partnerTags: true, partnerRoleTags: true } },
      },
    });
    return NextResponse.json(tags);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createTagSchema);
  if (!validation.success) return validation.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const tag = await prisma.tag.create({
      data: { name: validation.data.name, officeId },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
