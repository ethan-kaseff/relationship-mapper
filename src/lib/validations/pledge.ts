import { z } from "zod";

export const SOLICITATION_STATUSES = ["PENDING", "SENT", "PLEDGED", "DONATED", "DECLINED"] as const;
export const SOLICITATION_CHANNELS = ["PERSONAL", "EMAIL", "MAIL"] as const;

export const createPledgeSchema = z
  .object({
    peopleId: z.string().uuid().optional().nullable(),
    partnerId: z.string().uuid().optional().nullable(),
    solicitorId: z.string().uuid().optional().nullable(),
    pledgeAmount: z.number().int().min(0).optional().nullable(),
    pledgeDate: z.string().optional().nullable(),
    listedAs: z.string().max(300).optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
  })
  .refine((data) => data.peopleId || data.partnerId, {
    message: "A person or an organization is required",
    path: ["peopleId"],
  });

export const updatePledgeSchema = z.object({
  status: z.enum(SOLICITATION_STATUSES).optional(),
  solicitorId: z.string().uuid().optional().nullable(),
  pledgeAmount: z.number().int().min(0).optional().nullable(),
  pledgeDate: z.string().optional().nullable(),
  listedAs: z.string().max(300).optional().nullable(),
  palWrittenAt: z.string().optional().nullable(),
  palSentAt: z.string().optional().nullable(),
  calWrittenAt: z.string().optional().nullable(),
  calSentAt: z.string().optional().nullable(),
  nfgEntered: z.boolean().optional(),
  nfgUpdated: z.boolean().optional(),
  formInDrive: z.boolean().optional(),
  notes: z.string().max(5000).optional().nullable(),
});
