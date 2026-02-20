import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireSystemAdmin } from "@/lib/api-auth";
import { validateBody, createUserSchema } from "@/lib/validations";
import { handleApiError, conflict } from "@/lib/api-error";

// GET /api/users — list all users (SYSTEM_ADMIN only)
export async function GET() {
  const authResult = await requireSystemAdmin();
  if (!authResult.success) return authResult.response;

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/users — create a new user (SYSTEM_ADMIN only)
export async function POST(request: NextRequest) {
  const authResult = await requireSystemAdmin();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createUserSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return conflict("A user with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || "OFFICE_ADMIN",
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
