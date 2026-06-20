import type { Prisma } from "@prisma/client";

/**
 * Recompute a fundraiser's currentAmount from the actual sum of its donations,
 * within the given transaction. Use this after any donation create/edit/delete so
 * the stored total is always the true total and can never drift from the deltas.
 */
export async function recalcFundraiserTotal(
  tx: Prisma.TransactionClient,
  fundraiserId: string
): Promise<void> {
  const agg = await tx.donation.aggregate({
    where: { fundraiserId },
    _sum: { amount: true },
  });
  await tx.fundraiser.update({
    where: { id: fundraiserId },
    data: { currentAmount: agg._sum.amount ?? 0 },
  });
}
