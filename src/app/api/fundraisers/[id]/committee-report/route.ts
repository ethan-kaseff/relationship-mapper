import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";

const APPROVED = ["AUTO_APPROVED", "APPROVED"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: fundraiserId } = await params;
    const { searchParams } = new URL(request.url);
    const compareId = searchParams.get("compareToFundraiserId");

    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id: fundraiserId },
      select: { id: true, title: true },
    });
    if (!fundraiser) return notFound("Fundraiser not found");

    const solicitations = await prisma.fundraiserSolicitation.findMany({
      where: { fundraiserId, channel: "PERSONAL" },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, listedAs: true } },
        partner: { select: { id: true, organizationName: true, listedAs: true } },
        solicitor: { select: { firstName: true, lastName: true } },
        sponsorshipLevel: { select: { name: true } },
        solicitationNotes: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const peopleIds = solicitations.flatMap((s) => (s.peopleId ? [s.peopleId] : []));
    const partnerIds = solicitations.flatMap((s) => (s.partnerId ? [s.partnerId] : []));

    // One pull of every donation by these donors, across all fundraisers —
    // covers received-this, received-prior, past-donor, and last-event-date.
    const donations =
      peopleIds.length || partnerIds.length
        ? await prisma.donation.findMany({
            where: {
              approvalStatus: { in: APPROVED },
              OR: [
                ...(peopleIds.length ? [{ peopleId: { in: peopleIds } }] : []),
                ...(partnerIds.length ? [{ partnerId: { in: partnerIds } }] : []),
              ],
            },
            select: {
              amount: true,
              peopleId: true,
              partnerId: true,
              fundraiserId: true,
              donatedAt: true,
              calWrittenAt: true,
              calSentAt: true,
              fundraiser: { select: { eventId: true } },
            },
          })
        : [];

    // Compare fundraiser's pledge rows, indexed by donor, for prior-year columns
    let compareTitle: string | null = null;
    const priorByPerson = new Map<string, { pledgeAmount: number | null; status: string }>();
    const priorByPartner = new Map<string, { pledgeAmount: number | null; status: string }>();
    if (compareId) {
      const compare = await prisma.fundraiser.findUnique({
        where: { id: compareId },
        select: { title: true },
      });
      compareTitle = compare?.title ?? null;
      const priorSols = await prisma.fundraiserSolicitation.findMany({
        where: { fundraiserId: compareId },
        select: { peopleId: true, partnerId: true, pledgeAmount: true, status: true },
      });
      for (const s of priorSols) {
        if (s.peopleId) priorByPerson.set(s.peopleId, { pledgeAmount: s.pledgeAmount, status: s.status });
        if (s.partnerId) priorByPartner.set(s.partnerId, { pledgeAmount: s.pledgeAmount, status: s.status });
      }
    }

    const donationMatches = (d: (typeof donations)[number], peopleId: string | null, partnerId: string | null) =>
      (peopleId && d.peopleId === peopleId) || (partnerId && d.partnerId === partnerId);

    const rows = solicitations.map((s) => {
      const mine = donations.filter((d) => donationMatches(d, s.peopleId, s.partnerId));
      const receivedThis = mine
        .filter((d) => d.fundraiserId === fundraiserId)
        .reduce((sum, d) => sum + d.amount, 0);
      const receivedPrior = compareId
        ? mine.filter((d) => d.fundraiserId === compareId).reduce((sum, d) => sum + d.amount, 0)
        : 0;
      const pastDonor = mine.some((d) => d.fundraiserId !== fundraiserId);
      const eventDonations = mine
        .filter((d) => d.fundraiser.eventId && d.fundraiserId !== fundraiserId)
        .map((d) => d.donatedAt)
        .sort((a, b) => b.getTime() - a.getTime());
      const lastEventDonationDate = eventDonations[0] ?? null;

      // CAL lives on the donation; surface the matching one for this fundraiser
      const calDonation =
        mine.find((d) => d.fundraiserId === fundraiserId && (d.calWrittenAt || d.calSentAt)) ?? null;

      const prior = s.peopleId
        ? priorByPerson.get(s.peopleId)
        : s.partnerId
          ? priorByPartner.get(s.partnerId)
          : undefined;

      return {
        id: s.id,
        donorName: s.partner
          ? (s.partner.organizationName ?? "—")
          : s.person
            ? `${s.person.lastName}, ${s.person.firstName}`
            : "—",
        isOrg: !!s.partner,
        listedAs: s.partner?.listedAs ?? s.person?.listedAs ?? null,
        solicitor: s.solicitor ? `${s.solicitor.firstName} ${s.solicitor.lastName}` : null,
        status: s.status,
        sponsorshipLevel: s.sponsorshipLevel?.name ?? null,
        askAmount: s.askAmount,
        pledgeAmount: s.pledgeAmount,
        pledgeDate: s.pledgeDate,
        receivedThis,
        palWrittenAt: s.palWrittenAt,
        palSentAt: s.palSentAt,
        calWrittenAt: calDonation?.calWrittenAt ?? null,
        calSentAt: calDonation?.calSentAt ?? null,
        nfgEntered: s.nfgEntered,
        nfgUpdated: s.nfgUpdated,
        notes: s.solicitationNotes.map((n) => {
          const who = n.author ? `${n.author.firstName} ${n.author.lastName}` : "—";
          return `${new Date(n.createdAt).toLocaleDateString("en-US")} (${who}): ${n.content}`;
        }),
        pastDonor,
        lastEventDonationDate,
        priorPledgeAmount: prior?.pledgeAmount ?? null,
        priorReceived: compareId ? receivedPrior : null,
        priorStatus: prior?.status ?? null,
      };
    });

    rows.sort((a, b) => a.donorName.localeCompare(b.donorName));

    return NextResponse.json({
      fundraiserTitle: fundraiser.title,
      compareTitle,
      generatedAt: new Date().toISOString(),
      rows,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
