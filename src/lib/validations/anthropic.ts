import { z } from "zod";

export const anthropicConnectSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .regex(/^sk-ant-/, "That doesn't look like an Anthropic key — it should start with sk-ant-")
    .min(30, "Key looks too short")
    .max(300),
});
