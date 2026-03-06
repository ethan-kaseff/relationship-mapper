import { z } from "zod";

export const createHappeningSchema = z.object({
  happeningDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format" }
  ),
  happeningTime: z.string().max(20).optional().nullable(),
  happeningDescription: z.string().min(1, "Happening description is required").max(500),
});

export const updateHappeningSchema = createHappeningSchema.partial();

export type CreateHappeningInput = z.infer<typeof createHappeningSchema>;
export type UpdateHappeningInput = z.infer<typeof updateHappeningSchema>;
