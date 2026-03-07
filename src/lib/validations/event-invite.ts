import { z } from "zod";

export const bulkCreateInvitesSchema = z.object({
  peopleIds: z.array(z.string().uuid()).min(1, "At least one person is required"),
});

export const updateInviteSchema = z.object({
  rsvpStatus: z.enum(["PENDING", "YES", "NO", "MAYBE"]).optional(),
  meal: z.string().max(100).optional(),
  dietary: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional().nullable(),
  group: z.string().max(100).optional(),
});

export const bulkSaveSeatingSchema = z.object({
  seatingLayout: z.any(),
  seatAssignments: z.array(
    z.object({
      inviteId: z.string().uuid(),
      tableId: z.string().nullable(),
      seatIndex: z.number().int().nullable(),
    })
  ),
});

export const inviteFromPartnerSchema = z.object({
  partnerId: z.string().uuid(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export type BulkCreateInvitesInput = z.infer<typeof bulkCreateInvitesSchema>;
export type UpdateInviteInput = z.infer<typeof updateInviteSchema>;
export type BulkSaveSeatingInput = z.infer<typeof bulkSaveSeatingSchema>;
export type InviteFromPartnerInput = z.infer<typeof inviteFromPartnerSchema>;
