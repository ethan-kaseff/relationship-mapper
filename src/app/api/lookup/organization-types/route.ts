import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  try {
    const organizationTypes = await prisma.organizationType.findMany();
    return NextResponse.json(organizationTypes);
  } catch (error) {
    return handleApiError(error);
  }
}
