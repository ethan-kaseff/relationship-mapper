import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateFundraiserSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id },
      include: {
        donations: {
          orderBy: { donatedAt: "desc" },
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                status: true,
                city: true,
                state: true,
                zip: true,
                phoneNumber: true,
                email1: true,
                email2: true,
                communicationMethod: { select: { name: true } },
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                tags: { include: { tag: { select: { id: true, name: true } } } },
                partnerRoles: {
                  include: {
                    partner: {
                      include: {
                        organizationType: { select: { typeName: true } },
                      },
                    },
                  },
                },
              },
            },
            sponsorshipLevel: { select: { id: true, name: true, amount: true, seats: true, valetPasses: true } },
            partner: { select: { id: true, organizationName: true } },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            location: true,
            trackSeating: true,
            ticketPrice: true,
            mealCost: true,
            _count: { select: { invites: true } },
            invites: { select: { rsvpStatus: true } },
          },
        },
        sponsorshipLevels: { orderBy: [{ displayOrder: "asc" }, { amount: "desc" }] },
      },
    });
    if (!fundraiser) return notFound("Fundraiser not found");

    const { event, ...rest } = fundraiser;
    return NextResponse.json({
      ...rest,
      event: event
        ? {
            id: event.id,
            title: event.title,
            eventDate: event.eventDate,
            location: event.location,
            trackSeating: event.trackSeating,
            ticketPrice: event.ticketPrice,
            mealCost: event.mealCost,
            inviteCount: event._count.invites,
            yesCount: event.invites.filter((i) => i.rsvpStatus === "YES").length,
          }
        : null,
    });
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

  const validation = await validateBody(request, updateFundraiserSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;
    const fundraiser = await prisma.fundraiser.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        goalAmount: data.goalAmount,
        presetAmounts: data.presetAmounts,
        slug: data.slug,
        startDate: data.startDate !== undefined
          ? (data.startDate ? new Date(data.startDate) : null)
          : undefined,
        endDate: data.endDate !== undefined
          ? (data.endDate ? new Date(data.endDate) : null)
          : undefined,
        isActive: data.isActive,
        eventId: data.eventId,
        solicitorTagId: data.solicitorTagId,
      },
    });
    return NextResponse.json(fundraiser);
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
    await prisma.fundraiser.delete({ where: { id } });
    return NextResponse.json({ message: "Fundraiser deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
