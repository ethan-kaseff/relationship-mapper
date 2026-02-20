import { z } from "zod";

export const createConnectionSchema = z.object({
  peopleId: z.string().uuid("Invalid people ID"),
  partnerRoleId: z.string().uuid("Invalid partner role ID"),
  connectionDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format" }
  ),
  connectionTime: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateConnectionSchema = z.object({
  connectionDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Invalid date format" }
  ).optional(),
  connectionTime: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
