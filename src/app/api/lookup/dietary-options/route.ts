import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";
import { validateBody } from "@/lib/validations";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const { officeId } = authResult.session.user as { officeId: string };
    const options = await prisma.dietaryOption.findMany({
      where: { officeId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(options);
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({ name: z.string().min(1).max(100).trim() });

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createSchema);
  if (!validation.success) return validation.response;

  try {
    const { officeId } = authResult.session.user as { officeId: string };
    const option = await prisma.dietaryOption.upsert({
      where: { name_officeId: { name: validation.data.name, officeId } },
      create: { name: validation.data.name, officeId },
      update: {},
    });
    return NextResponse.json(option, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
