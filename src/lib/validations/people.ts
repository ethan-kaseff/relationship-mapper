import { z } from "zod";

export const createPeopleSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  phoneNumber: z.string().max(50).optional().nullable(),
  personalEmail: z.string().email().optional().nullable().or(z.literal("")),
  isConnector: z.boolean().default(false),
  officeId: z.string().uuid().optional(), // System admins can specify
});

export const updatePeopleSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  phoneNumber: z.string().max(50).optional().nullable(),
  personalEmail: z.string().email().optional().nullable().or(z.literal("")),
  isConnector: z.boolean().optional(),
});

export type CreatePeopleInput = z.infer<typeof createPeopleSchema>;
export type UpdatePeopleInput = z.infer<typeof updatePeopleSchema>;
