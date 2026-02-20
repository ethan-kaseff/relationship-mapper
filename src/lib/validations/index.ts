export * from "./partner";
export * from "./people";
export * from "./relationship";
export * from "./connection";
export * from "./event";
export * from "./event-response";
export * from "./partner-role";
export * from "./user";

import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Validate request body against a Zod schema.
 * Returns the parsed data if valid, or a 400 error response if invalid.
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      return {
        success: false,
        response: NextResponse.json(
          { error: "Validation failed", details: errors },
          { status: 400 }
        ),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
}
