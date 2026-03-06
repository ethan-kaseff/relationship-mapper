import { z } from "zod";

export const createHappeningResponseSchema = z.object({
  peopleId: z.string().uuid("Invalid people ID"),
  happeningId: z.string().uuid("Invalid happening ID"),
  responseDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format" }
  ).optional().nullable(),
  responseTime: z.string().max(20).optional().nullable(),
  responseNotes: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().default(true),
});

export const updateHappeningResponseSchema = z.object({
  responseDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format" }
  ).optional().nullable(),
  responseTime: z.string().max(20).optional().nullable(),
  responseNotes: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().optional(),
});

export type CreateHappeningResponseInput = z.infer<typeof createHappeningResponseSchema>;
export type UpdateHappeningResponseInput = z.infer<typeof updateHappeningResponseSchema>;
