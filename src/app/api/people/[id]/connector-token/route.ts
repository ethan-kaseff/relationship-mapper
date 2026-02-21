import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "SYSTEM_ADMIN" && role !== "OFFICE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const token = crypto.randomUUID();

    const person = await prisma.people.update({
      where: { id },
      data: { connectorToken: token },
    });

    return NextResponse.json({ connectorToken: person.connectorToken });
  } catch (error) {
    console.error("Failed to generate connector token:", error);
    return NextResponse.json(
      { error: "Failed to generate connector token" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "SYSTEM_ADMIN" && role !== "OFFICE_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.people.update({
      where: { id },
      data: { connectorToken: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to revoke connector token:", error);
    return NextResponse.json(
      { error: "Failed to revoke connector token" },
      { status: 500 }
    );
  }
}
