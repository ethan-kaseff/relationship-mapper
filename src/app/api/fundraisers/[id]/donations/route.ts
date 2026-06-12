import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createDonationSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";
import { matchDonationToPledge } from "@/lib/pledge-matching";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const fundraiser = await prisma.fundraiser.findUnique({ where: { id } });
    if (!fundraiser) return notFound("Fundraiser not found");

    const donations = await prisma.donation.findMany({
      where: { fundraiserId: id },
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
        sponsorshipLevel: { select: { id: true, name: true, amount: true, seats: true } },
        partner: { select: { id: true, organizationName: true } },
      },
      orderBy: { donatedAt: "desc" },
    });

    return NextResponse.json(donations);
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

  const validation = await validateBody(request, createDonationSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: fundraiserId } = await params;
    const data = validation.data;

    // Use a transaction to create donation and update currentAmount atomically
    const { donation, eventId } = await prisma.$transaction(async (tx) => {
      const fundraiser = await tx.fundraiser.findUnique({
        where: { id: fundraiserId },
      });
      if (!fundraiser) throw new Error("FUNDRAISER_NOT_FOUND");

      // Auto-set sponsoredSeats from level if not explicitly provided
      let sponsoredSeats = data.sponsoredSeats ?? null;
      if (data.sponsorshipLevelId && sponsoredSeats === null) {
        const level = await tx.sponsorshipLevel.findUnique({ where: { id: data.sponsorshipLevelId } });
        sponsoredSeats = level?.seats ?? null;
      }

      // Default seatsUsed to sponsoredSeats (max) if not explicitly provided
      const seatsUsed = data.seatsUsed !== undefined ? data.seatsUsed : sponsoredSeats;

      const newDonation = await tx.donation.create({
        data: {
          fundraiserId,
          amount: data.amount,
          donorName: data.donorName,
          donorEmail: data.donorEmail,
          peopleId: data.peopleId ?? null,
          sponsorshipLevelId: data.sponsorshipLevelId ?? null,
          partnerId: data.partnerId ?? null,
          sponsoredSeats,
          seatsUsed,
          isAnonymous: data.isAnonymous ?? false,
          paymentMethod: data.paymentMethod ?? "other",
          tributeType: data.tributeType ?? null,
          tributeName: data.tributeName ?? null,
          isTaxDeductible: data.isTaxDeductible ?? true,
          taxDeductibleAmount: data.taxDeductibleAmount ?? null,
          notes: data.notes,
          // Staff picking a known person or org already answers the identity
          // question — only unlinked names need the approval queue
          approvalStatus: data.peopleId || data.partnerId ? "AUTO_APPROVED" : "PENDING",
          donatedAt: data.donatedAt ? new Date(data.donatedAt) : new Date(),
        },
      });

      await tx.fundraiser.update({
        where: { id: fundraiserId },
        data: { currentAmount: { increment: data.amount } },
      });

      return { donation: newDonation, eventId: fundraiser.eventId };
    });

    // Close the loop on a matching open pledge (auto-approved entries only;
    // pending ones match at approval time)
    if (donation.approvalStatus === "AUTO_APPROVED") {
      await matchDonationToPledge({
        fundraiserId,
        donationAmount: donation.amount,
        peopleId: donation.peopleId,
        partnerId: donation.partnerId,
        authorId: authResult.session.user.id,
      });
    }

    // Determine the group name for this donation
    let group: string | null = null;
    if (data.partnerId) {
      const partner = await prisma.partner.findUnique({ where: { id: data.partnerId }, select: { organizationName: true } });
      group = partner?.organizationName ?? null;
    }
    if (!group) group = data.group || data.donorName || null;

    if (eventId && group) {
      if (data.peopleId) {
        // Individual person: RSVP yes and update group on existing invite or create one
        const existingInvite = await prisma.eventInvite.findFirst({
          where: { eventId, peopleId: data.peopleId },
        });
        if (existingInvite) {
          await prisma.eventInvite.update({
            where: { id: existingInvite.id },
            data: { group, rsvpStatus: "YES" },
          });
        } else {
          await prisma.eventInvite.create({
            data: {
              eventId,
              peopleId: data.peopleId,
              isPlaceholder: false,
              isGuest: false,
              group,
              rsvpStatus: "YES",
              ticketType: "Regular",
            },
          });
        }
      } else if (data.partnerId) {
        // Partner org: create named invites for people who hold roles at this partner (no RSVP change)
        const roles = await prisma.partnerRole.findMany({
          where: { partnerId: data.partnerId, peopleId: { not: null } },
          select: { peopleId: true },
          distinct: ["peopleId"],
        });
        for (const role of roles) {
          const pid = role.peopleId!;
          const existing = await prisma.eventInvite.findFirst({
            where: { eventId, peopleId: pid },
          });
          if (existing) {
            await prisma.eventInvite.update({
              where: { id: existing.id },
              data: { group },
            });
          } else {
            await prisma.eventInvite.create({
              data: {
                eventId,
                peopleId: pid,
                isPlaceholder: false,
                isGuest: false,
                group,
                ticketType: "Regular",
              },
            });
          }
        }
      } else if (data.donorName) {
        // Manual guest name (not in system): RSVP yes and create one named guest invite if none exists for this group
        const existingNamed = await prisma.eventInvite.findFirst({
          where: { eventId, group, isPlaceholder: false },
        });
        if (existingNamed) {
          await prisma.eventInvite.update({
            where: { id: existingNamed.id },
            data: { rsvpStatus: "YES" },
          });
        } else {
          await prisma.eventInvite.create({
            data: {
              eventId,
              peopleId: null,
              guestName: data.donorName,
              isGuest: true,
              isPlaceholder: false,
              group,
              rsvpStatus: "YES",
              ticketType: "Regular",
            },
          });
        }
      }
    }

    // Reconcile event invite placeholders for new donation
    const effectiveSeatsUsed = donation.seatsUsed;
    const effectiveSponsoredSeats = donation.sponsoredSeats;
    if (eventId && effectiveSeatsUsed !== null && effectiveSponsoredSeats !== 0 && group) {
      const invites = await prisma.eventInvite.findMany({
        where: { eventId, group },
        select: { id: true, isPlaceholder: true, tableId: true },
      });
      const namedCount = invites.filter((i) => !i.isPlaceholder).length;
      const placeholders = invites.filter((i) => i.isPlaceholder);
      const desiredPlaceholders = Math.max(0, effectiveSeatsUsed - namedCount);
      const diff = desiredPlaceholders - placeholders.length;

      if (diff > 0) {
        await prisma.eventInvite.createMany({
          data: Array.from({ length: diff }, () => ({
            eventId,
            peopleId: null,
            isPlaceholder: true,
            group,
            ticketType: "Regular",
          })),
        });
      } else if (diff < 0) {
        const toRemove = [...placeholders]
          .sort((a, b) => (a.tableId ? 1 : 0) - (b.tableId ? 1 : 0))
          .slice(0, Math.abs(diff))
          .map((p) => p.id);
        await prisma.eventInvite.deleteMany({ where: { id: { in: toRemove } } });
      }
    }

    return NextResponse.json(donation, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FUNDRAISER_NOT_FOUND") {
      return notFound("Fundraiser not found");
    }
    return handleApiError(error);
  }
}
