import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(100),
  officeId: z.string().optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100),
  officeId: z.string().optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
