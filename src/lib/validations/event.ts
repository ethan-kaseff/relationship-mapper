import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  eventDate: z.string().optional().nullable(),
  eventTime: z.string().max(20).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  templateEventId: z.string().uuid().optional().nullable(),
  isAnnualEvent: z.boolean().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  eventDate: z.string().optional().nullable(),
  eventTime: z.string().max(20).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
