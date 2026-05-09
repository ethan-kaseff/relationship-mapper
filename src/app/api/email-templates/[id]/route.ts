import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(255).optional(),
  body: z.string().min(1).max(10000).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;
  try {
    const { id } = await params;
    const user = authResult.session.user as { officeId: string; role: string };
    const where = user.role === "SYSTEM_ADMIN" ? { id } : { id, officeId: user.officeId };
    const existing = await prisma.emailTemplate.findFirst({ where });
    if (!existing) return notFound("Template not found");
    const body = await request.json();
    const data = templateSchema.parse(body);
    const template = await prisma.emailTemplate.update({ where: { id }, data });
    return NextResponse.json(template);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;
  try {
    const { id } = await params;
    const user = authResult.session.user as { officeId: string; role: string };
    const where = user.role === "SYSTEM_ADMIN" ? { id } : { id, officeId: user.officeId };
    const existing = await prisma.emailTemplate.findFirst({ where });
    if (!existing) return notFound("Template not found");
    await prisma.emailTemplate.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
