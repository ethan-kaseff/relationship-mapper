import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT /api/offices/[id] — update office name
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Office name is required" }, { status: 400 });
  }

  const office = await prisma.office.update({
    where: { id },
    data: { name: name.trim() },
  });

  return NextResponse.json(office);
}

// DELETE /api/offices/[id] — delete office (only if empty)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const office = await prisma.office.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, people: true, partners: true } },
    },
  });

  if (!office) {
    return NextResponse.json({ error: "Office not found" }, { status: 404 });
  }

  const total = office._count.users + office._count.people + office._count.partners;
  if (total > 0) {
    return NextResponse.json(
      { error: "Cannot delete office that has users, people, or partners assigned to it", counts: office._count },
      { status: 409 }
    );
  }

  await prisma.office.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
