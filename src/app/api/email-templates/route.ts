import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(255),
  body: z.string().min(1).max(10000),
});

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;
  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const templates = await prisma.emailTemplate.findMany({
      where: { officeId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;
  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const body = await request.json();
    const data = templateSchema.parse(body);
    const template = await prisma.emailTemplate.create({
      data: { ...data, officeId },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
