import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";

// GET /api/users — list users (SYSTEM_ADMIN: all, OFFICE_ADMIN: own office)
export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "SYSTEM_ADMIN" && session.user.role !== "OFFICE_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const where = session.user.role === "OFFICE_ADMIN"
      ? { officeId: session.user.officeId }
      : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        officeId: true,
        office: { select: { name: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/users — create a new user (SYSTEM_ADMIN: any office, OFFICE_ADMIN: own office)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "SYSTEM_ADMIN" && session.user.role !== "OFFICE_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, firstName, lastName, role, officeId } = body;

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ error: "Email, password, first name, and last name are required" }, { status: 400 });
  }

  const isOfficeAdmin = session.user.role === "OFFICE_ADMIN";

  // Office admins can only create users in their own office
  const targetOfficeId = isOfficeAdmin ? session.user.officeId : officeId;
  if (!targetOfficeId) {
    return NextResponse.json({ error: "Office is required" }, { status: 400 });
  }

  // Office admins cannot create system admins
  const allowedRoles = isOfficeAdmin
    ? ["OFFICE_ADMIN", "OFFICE_USER", "CONNECTOR"]
    : ["SYSTEM_ADMIN", "OFFICE_ADMIN", "OFFICE_USER", "CONNECTOR"];

  if (role && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, role: role || "OFFICE_ADMIN", officeId: targetOfficeId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, officeId: true, office: { select: { name: true } } },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
