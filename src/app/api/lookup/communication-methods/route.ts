import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const methods = await prisma.communicationMethod.findMany({
      include: { _count: { select: { people: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(methods);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createSchema);
  if (!validation.success) return validation.response;

  try {
    const method = await prisma.communicationMethod.create({
      data: { name: validation.data.name },
    });
    return NextResponse.json(method, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
