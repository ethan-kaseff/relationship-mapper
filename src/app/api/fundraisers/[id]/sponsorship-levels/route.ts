import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createSponsorshipLevelSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const fundraiser = await prisma.fundraiser.findUnique({ where: { id } });
    if (!fundraiser) return notFound("Fundraiser not found");

    const levels = await prisma.sponsorshipLevel.findMany({
      where: { fundraiserId: id },
      orderBy: [{ displayOrder: "asc" }, { amount: "desc" }],
    });
    return NextResponse.json(levels);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createSponsorshipLevelSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: fundraiserId } = await params;
    const fundraiser = await prisma.fundraiser.findUnique({ where: { id: fundraiserId } });
    if (!fundraiser) return notFound("Fundraiser not found");

    const level = await prisma.sponsorshipLevel.create({
      data: { ...validation.data, fundraiserId },
    });
    return NextResponse.json(level, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
