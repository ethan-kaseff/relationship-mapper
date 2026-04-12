import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/api-auth";
import { handleApiError, badRequest, conflict } from "@/lib/api-error";

// GET /api/users — list users (SYSTEM_ADMIN: all, OFFICE_ADMIN: own office)
export async function GET() {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const { session } = authResult;

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
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const { session } = authResult;
  const body = await request.json();
  const { email, password, firstName, lastName, role, officeId } = body;

  if (!email || !password || !firstName || !lastName) {
    return badRequest("Email, password, first name, and last name are required");
  }

  const isOfficeAdmin = session.user.role === "OFFICE_ADMIN";

  // Office admins can only create users in their own office
  const targetOfficeId = isOfficeAdmin ? session.user.officeId : officeId;
  if (!targetOfficeId) {
    return badRequest("Office is required");
  }

  // Office admins cannot create system admins
  const allowedRoles = isOfficeAdmin
    ? ["OFFICE_ADMIN", "OFFICE_USER", "VIEWER", "CONNECTOR"]
    : ["SYSTEM_ADMIN", "OFFICE_ADMIN", "OFFICE_USER", "VIEWER", "CONNECTOR"];

  if (role && !allowedRoles.includes(role)) {
    return badRequest("Invalid role");
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return conflict("A user with this email already exists");
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
