import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSystemAdmin } from "@/lib/api-auth";
import { handleApiError, badRequest, conflict } from "@/lib/api-error";

// GET /api/offices — list all offices (SYSTEM_ADMIN only)
export async function GET() {
  const authResult = await requireSystemAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const offices = await prisma.office.findMany({
      include: {
        _count: { select: { users: true, people: true, partners: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(offices);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/offices — create a new office (SYSTEM_ADMIN only)
export async function POST(request: NextRequest) {
  const authResult = await requireSystemAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const body = await request.json();
    const { name, isSiloed } = body;

    if (!name || !name.trim()) {
      return badRequest("Office name is required");
    }

    const existing = await prisma.office.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return conflict("An office with this name already exists");
    }

    const data: { name: string; isSiloed?: boolean } = { name: name.trim() };
    if (typeof isSiloed === "boolean") data.isSiloed = isSiloed;

    const office = await prisma.office.create({ data });

    return NextResponse.json(office, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
