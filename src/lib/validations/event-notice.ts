import { z } from "zod";

const noticeConditionSchema = z.object({
  id: z.string(),
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.string().default(""),
});

export const createEventNoticeSchema = z.object({
  name: z.string().min(1).max(200),
  conditions: z.array(noticeConditionSchema).default([]),
  conditionLogic: z.enum(["AND", "OR"]).default("AND"),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  eventId: z.string().optional(),
});

export const updateEventNoticeSchema = createEventNoticeSchema.partial();
