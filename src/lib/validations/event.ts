import { z } from "zod";

export const createEventSchema = z.object({
  eventDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format" }
  ),
  eventTime: z.string().max(20).optional().nullable(),
  eventDescription: z.string().min(1, "Event description is required").max(500),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
