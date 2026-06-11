import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, conflict } from "@/lib/api-error";
import { createPledgeSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: fundraiserId } = await params;
    const solicitations = await prisma.fundraiserSolicitation.findMany({
      where: { fundraiserId },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, email1: true, email2: true } },
        partner: { select: { id: true, organizationName: true, email: true } },
        solicitor: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(solicitations);
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

  try {
    const { id: fundraiserId } = await params;
    const body = await request.json();

    // Bulk add to ask list (existing flow): { peopleIds: [...] }
    if (Array.isArray(body.peopleIds)) {
      const peopleIds = body.peopleIds as string[];
      const existing = await prisma.fundraiserSolicitation.findMany({
        where: { fundraiserId, peopleId: { in: peopleIds } },
        select: { peopleId: true },
      });
      const existingIds = new Set(existing.map((s) => s.peopleId));
      const newIds = peopleIds.filter((pid) => !existingIds.has(pid));

      if (newIds.length === 0) return conflict("All selected people are already on the list");

      const result = await prisma.fundraiserSolicitation.createMany({
        data: newIds.map((peopleId) => ({ fundraiserId, peopleId })),
      });

      return NextResponse.json({ created: result.count, skipped: existingIds.size }, { status: 201 });
    }

    // Single personal-solicitation pledge: { peopleId | partnerId, ... }
    const parsed = createPledgeSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => ({ path: e.path.join("."), message: e.message }));
      return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
    }
    const data = parsed.data;

    const duplicate = await prisma.fundraiserSolicitation.findFirst({
      where: {
        fundraiserId,
        OR: [
          ...(data.peopleId ? [{ peopleId: data.peopleId }] : []),
          ...(data.partnerId ? [{ partnerId: data.partnerId }] : []),
        ],
      },
    });
    if (duplicate) return conflict("This person or organization is already on the list for this fundraiser");

    const pledge = await prisma.fundraiserSolicitation.create({
      data: {
        fundraiserId,
        peopleId: data.peopleId ?? null,
        partnerId: data.partnerId ?? null,
        channel: "PERSONAL",
        solicitorId: data.solicitorId ?? null,
        pledgeAmount: data.pledgeAmount ?? null,
        pledgeDate: data.pledgeDate ? new Date(data.pledgeDate) : null,
        listedAs: data.listedAs ?? null,
        notes: data.notes ?? null,
        ...(data.pledgeAmount && data.pledgeDate ? { status: "PLEDGED" } : {}),
      },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, email1: true, email2: true } },
        partner: { select: { id: true, organizationName: true, email: true } },
        solicitor: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(pledge, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
