import { z } from "zod";

export const createDonationSchema = z.object({
  amount: z.number().int().min(1, "Amount must be at least 1 cent"),
  donorName: z.string().max(200).optional().nullable(),
  donorEmail: z.string().email().max(300).optional().nullable(),
  peopleId: z.string().uuid().optional().nullable(),
  isAnonymous: z.boolean().optional(),
  paymentMethod: z.enum(["stripe", "cash", "check", "other"]).optional(),
  tributeType: z.enum(["in_honor_of", "in_memory_of"]).optional().nullable(),
  tributeName: z.string().max(200).optional().nullable(),
  isTaxDeductible: z.boolean().optional(),
  taxDeductibleAmount: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  donatedAt: z.string().optional().nullable(),
});

export const updateDonationApprovalSchema = z.object({
  approvalStatus: z.enum(["APPROVED", "REJECTED"]),
  peopleId: z.string().uuid().optional().nullable(),
  createPerson: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type CreateDonationInput = z.infer<typeof createDonationSchema>;
export type UpdateDonationApprovalInput = z.infer<typeof updateDonationApprovalSchema>;
