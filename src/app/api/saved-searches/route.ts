import { NextResponse } from "next/server";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const userId = authResult.session.user.id as string;
    const searches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, filters: true, createdAt: true },
    });
    return NextResponse.json(searches);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const userId = authResult.session.user.id as string;
    const { name, filters } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const search = await prisma.savedSearch.create({
      data: { name: name.trim(), filters, userId },
      select: { id: true, name: true, filters: true, createdAt: true },
    });
    return NextResponse.json(search);
  } catch (error) {
    return handleApiError(error);
  }
}
