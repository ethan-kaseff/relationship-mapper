import { z } from "zod";

export const createSponsorshipLevelSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().int().min(0),
  seats: z.number().int().min(0).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  displayOrder: z.number().int().optional(),
});

export const updateSponsorshipLevelSchema = createSponsorshipLevelSchema.partial();

export type CreateSponsorshipLevelInput = z.infer<typeof createSponsorshipLevelSchema>;
export type UpdateSponsorshipLevelInput = z.infer<typeof updateSponsorshipLevelSchema>;
