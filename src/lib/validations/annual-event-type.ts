import { z } from "zod";

export const createAnnualEventTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const updateAnnualEventTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export type CreateAnnualEventTypeInput = z.infer<typeof createAnnualEventTypeSchema>;
export type UpdateAnnualEventTypeInput = z.infer<typeof updateAnnualEventTypeSchema>;
