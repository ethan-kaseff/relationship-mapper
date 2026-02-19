import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

// GET /api/users — list all users (SYSTEM_ADMIN only)
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true, officeId: true, office: { select: { name: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(users);
}

// POST /api/users — create a new user (SYSTEM_ADMIN only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, firstName, lastName, role, officeId } = body;

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: "Email, password, first name, and last name are required" }, { status: 400 });
  }

  if (!officeId) {
    return NextResponse.json({ error: "Office is required" }, { status: 400 });
  }

  if (role && !["SYSTEM_ADMIN", "OFFICE_ADMIN", "OFFICE_USER", "CONNECTOR"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, firstName, lastName, role: role || "OFFICE_ADMIN", officeId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, officeId: true, office: { select: { name: true } } },
  });

  return NextResponse.json(user, { status: 201 });
}
