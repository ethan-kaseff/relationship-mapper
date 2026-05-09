import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(255),
  body: z.string().min(1).max(10000),
  officeId: z.string().optional(),
});

export async function GET(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;
  try {
    const user = authResult.session.user as { officeId: string; role: string };
    const url = new URL(request.url);
    const queryOfficeId = url.searchParams.get("officeId");
    if (user.role === "SYSTEM_ADMIN" && !queryOfficeId) {
      // Return all offices' templates with office info
      const templates = await prisma.emailTemplate.findMany({
        orderBy: [{ office: { name: "asc" } }, { name: "asc" }],
        include: { office: { select: { id: true, name: true } } },
      });
      return NextResponse.json(templates);
    }
    const officeId =
      user.role === "SYSTEM_ADMIN" && queryOfficeId ? queryOfficeId : user.officeId;
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
    const user = authResult.session.user as { officeId: string; role: string };
    const body = await request.json();
    const { officeId: bodyOfficeId, ...data } = templateSchema.parse(body);
    const officeId =
      user.role === "SYSTEM_ADMIN" && bodyOfficeId ? bodyOfficeId : user.officeId;
    const template = await prisma.emailTemplate.create({
      data: { ...data, officeId },
      include: { office: { select: { id: true, name: true } } },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
