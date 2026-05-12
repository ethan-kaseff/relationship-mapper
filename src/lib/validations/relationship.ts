import { z } from "zod";

export const createRelationshipSchema = z.object({
  peopleId: z.string().uuid("Invalid people ID"),
  targetPersonId: z.string().uuid("Invalid target person ID").optional(),
  partnerRoleId: z.string().uuid("Invalid partner role ID").optional().nullable(),
  relationshipTypeIds: z.array(z.string().uuid("Invalid relationship type ID")).min(1, "At least one relationship type is required"),
  lastReviewedDate: z.string().datetime().optional().nullable(),
});

export const updateRelationshipSchema = z.object({
  relationshipTypeIds: z.array(z.string().uuid("Invalid relationship type ID")).min(1).optional(),
  lastReviewedDate: z.string().datetime().optional().nullable(),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;
