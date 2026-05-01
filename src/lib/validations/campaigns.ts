import { z } from "zod";

export const campaignCreateSchema = z.object({
  title:   z.string().min(1, "Title is required"),
  subject: z.string().min(1, "Subject is required"),
  body:    z.string().min(1, "Body is required"),
  theme:   z.enum(["classic", "navy", "warm", "modern"]).default("classic"),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export const campaignSendSchema = z.object({
  recipientIds: z.array(z.string()).min(1, "Select at least one recipient"),
});
