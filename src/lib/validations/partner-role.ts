import { z } from "zod";

export const createPartnerRoleSchema = z.object({
  partnerId: z.string().uuid("Invalid partner ID"),
  roleDescription: z.string().min(1, "Role description is required").max(255),
  peopleId: z.string().uuid("Invalid people ID").optional().nullable(),
  startDate: z.string().optional().nullable(),
});

export const updatePartnerRoleSchema = z.object({
  roleDescription: z.string().min(1).max(255).optional(),
  peopleId: z.string().uuid("Invalid people ID").optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export type CreatePartnerRoleInput = z.infer<typeof createPartnerRoleSchema>;
export type UpdatePartnerRoleInput = z.infer<typeof updatePartnerRoleSchema>;
