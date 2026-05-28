import { z } from "zod";

export const bulkCreateInvitesSchema = z.object({
  peopleIds: z.array(z.string().uuid()).optional().default([]),
  guests: z.array(z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(200).optional(),
  })).optional().default([]),
  placeholderCount: z.number().int().min(1).max(100).optional(),
  notes: z.string().max(1000).optional().nullable(),
}).refine(
  (data) => (data.peopleIds && data.peopleIds.length > 0) || (data.guests && data.guests.length > 0) || (data.placeholderCount && data.placeholderCount > 0),
  { message: "At least one person, guest, or placeholder count is required" }
);

export const updateInviteSchema = z.object({
  rsvpStatus: z.enum(["PENDING", "YES", "NO", "MAYBE"]).optional(),
  meal: z.string().max(100).optional(),
  dietary: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional().nullable(),
  group: z.string().max(100).optional(),
  attended: z.boolean().optional(),
  ticketType: z.string().max(50).optional(),
  seatingRequest: z.string().max(500).optional().nullable(),
  guestName: z.string().max(200).optional().nullable(),
  guestEmail: z.string().email().max(200).optional().nullable(),
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
