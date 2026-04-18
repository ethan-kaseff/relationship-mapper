import { z } from "zod";

export const createFundraiserSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  goalAmount: z.number().int().min(1, "Goal amount must be at least 1 cent"),
  presetAmounts: z.array(z.number().int().min(1)).optional(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  eventId: z.string().uuid().optional().nullable(),
});

export const updateFundraiserSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  goalAmount: z.number().int().min(1).optional(),
  presetAmounts: z.array(z.number().int().min(1)).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  eventId: z.string().uuid().optional().nullable(),
});

export type CreateFundraiserInput = z.infer<typeof createFundraiserSchema>;
export type UpdateFundraiserInput = z.infer<typeof updateFundraiserSchema>;
