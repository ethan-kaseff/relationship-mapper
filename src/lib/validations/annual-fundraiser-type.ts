import { z } from "zod";

export const createAnnualFundraiserTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const updateAnnualFundraiserTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export type CreateAnnualFundraiserTypeInput = z.infer<typeof createAnnualFundraiserTypeSchema>;
export type UpdateAnnualFundraiserTypeInput = z.infer<typeof updateAnnualFundraiserTypeSchema>;
