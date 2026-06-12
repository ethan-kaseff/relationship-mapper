import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";

/**
 * After a donation is confirmed, close the loop on any open pledge
 * (personal solicitation) for the same person/org on the same fundraiser:
 * - donations covering the pledge amount mark it Received (DONATED)
 * - partial payments leave the status alone but log progress in the
 *   pledge's note trail
 *
 * Never throws — donation recording must succeed even if matching fails.
 */
export async function matchDonationToPledge({
  fundraiserId,
  donationAmount,
  peopleId,
  partnerId,
  authorId,
}: {
  fundraiserId: string;
  donationAmount: number;
  peopleId: string | null;
  partnerId: string | null;
  authorId: string;
}): Promise<void> {
  try {
    if (!peopleId && !partnerId) return;

    const donorFilter = partnerId ? { partnerId } : { peopleId };

    const pledge = await prisma.fundraiserSolicitation.findFirst({
      where: {
        fundraiserId,
        status: { notIn: ["DONATED", "DECLINED"] },
        ...donorFilter,
      },
    });
    if (!pledge) return;

    const received = await prisma.donation.aggregate({
      _sum: { amount: true },
      where: {
        fundraiserId,
        approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
        ...donorFilter,
      },
    });
    const totalReceived = received._sum.amount ?? 0;
    const fulfilled = pledge.pledgeAmount == null || totalReceived >= pledge.pledgeAmount;

    if (fulfilled) {
      await prisma.fundraiserSolicitation.update({
        where: { id: pledge.id },
        data: { status: "DONATED" },
      });
      await prisma.solicitationNote.create({
        data: {
          solicitationId: pledge.id,
          authorId,
          content: `Marked received automatically — ${formatCurrency(donationAmount)} donation recorded${
            pledge.pledgeAmount != null && totalReceived !== donationAmount
              ? ` (${formatCurrency(totalReceived)} total)`
              : ""
          }.`,
        },
      });
    } else {
      await prisma.solicitationNote.create({
        data: {
          solicitationId: pledge.id,
          authorId,
          content: `Partial payment received: ${formatCurrency(donationAmount)} of ${formatCurrency(pledge.pledgeAmount!)} pledged (${formatCurrency(totalReceived)} so far).`,
        },
      });
    }
  } catch {
    // Matching is best-effort; the donation itself already saved.
  }
}
