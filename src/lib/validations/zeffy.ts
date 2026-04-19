import { z } from "zod";

export const zeffyConnectSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
});
