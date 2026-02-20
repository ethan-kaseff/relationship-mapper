import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/offices — list all offices (SYSTEM_ADMIN only)
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const offices = await prisma.office.findMany({
    include: {
      _count: { select: { users: true, people: true, partners: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(offices);
}

// POST /api/offices — create a new office (SYSTEM_ADMIN only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Office name is required" }, { status: 400 });
  }

  const existing = await prisma.office.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "An office with this name already exists" }, { status: 409 });
  }

  const office = await prisma.office.create({
    data: { name: name.trim() },
  });

  return NextResponse.json(office, { status: 201 });
}
