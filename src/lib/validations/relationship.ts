import { z } from "zod";

export const createRelationshipSchema = z.object({
  peopleId: z.string().uuid("Invalid people ID"),
  targetPersonId: z.string().uuid("Invalid target person ID").optional(), // Can be derived from partnerRole
  partnerRoleId: z.string().uuid("Invalid partner role ID").optional().nullable(),
  relationshipTypeId: z.string().uuid("Invalid relationship type ID"),
  lastReviewedDate: z.string().datetime().optional().nullable(),
});

export const updateRelationshipSchema = z.object({
  relationshipTypeId: z.string().uuid("Invalid relationship type ID").optional(),
  lastReviewedDate: z.string().datetime().optional().nullable(),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;
