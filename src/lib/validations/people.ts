import { z } from "zod";

export const createPeopleSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(255),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  phoneNumber: z.string().max(50).optional().nullable(),
  personalEmail: z.string().email().optional().nullable().or(z.literal("")),
  isConnector: z.boolean().default(false),
});

export const updatePeopleSchema = createPeopleSchema.partial();

export type CreatePeopleInput = z.infer<typeof createPeopleSchema>;
export type UpdatePeopleInput = z.infer<typeof updatePeopleSchema>;
