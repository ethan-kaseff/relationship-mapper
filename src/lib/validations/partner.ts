import { z } from "zod";

export const createPartnerSchema = z.object({
  orgPeopleFlag: z.enum(["O", "P"], {
    message: "orgPeopleFlag must be 'O' (Organization) or 'P' (Person)",
  }),
  organizationName: z.string().min(1, "Organization name is required").max(255),
  organizationTypeId: z.string().uuid().optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  phoneNumber: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  website: z.string().url().optional().nullable().or(z.literal("")),
  officeId: z.string().uuid().optional(), // System admins can specify
});

export const updatePartnerSchema = createPartnerSchema.partial();

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
