import { z } from "zod";

export const createRelationshipSchema = z.object({
  peopleId: z.string().uuid("Invalid people ID"),
  partnerRoleId: z.string().uuid("Invalid partner role ID"),
  relationshipTypeId: z.string().uuid("Invalid relationship type ID"),
  lastReviewedDate: z.string().datetime().optional().nullable(),
});

export const updateRelationshipSchema = z.object({
  relationshipTypeId: z.string().uuid("Invalid relationship type ID").optional(),
  lastReviewedDate: z.string().datetime().optional().nullable(),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;
