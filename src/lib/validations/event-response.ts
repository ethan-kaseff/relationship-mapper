import { z } from "zod";

export const createEventResponseSchema = z.object({
  peopleId: z.string().uuid("Invalid people ID"),
  eventId: z.string().uuid("Invalid event ID"),
  responseDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format" }
  ).optional().nullable(),
  responseTime: z.string().max(20).optional().nullable(),
  responseNotes: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().default(true),
});

export const updateEventResponseSchema = z.object({
  responseDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format" }
  ).optional().nullable(),
  responseTime: z.string().max(20).optional().nullable(),
  responseNotes: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().optional(),
});

export type CreateEventResponseInput = z.infer<typeof createEventResponseSchema>;
export type UpdateEventResponseInput = z.infer<typeof updateEventResponseSchema>;
