import { z } from "zod";
import { ROLES } from "@/types/roles";

const roleValues = Object.values(ROLES) as [string, ...string[]];

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(255),
  role: z.enum(roleValues).default("OFFICE_ADMIN"),
});

export const updateUserSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(roleValues).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
