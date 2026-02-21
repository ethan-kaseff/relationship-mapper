import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const person = await prisma.people.findUnique({
      where: { connectorToken: token },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        officeId: true,
      },
    });

    if (!person) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const partnerRoles = await prisma.partnerRole.findMany({
      where: {
        partner: { officeId: person.officeId },
      },
      include: {
        partner: {
          select: { organizationName: true },
        },
        person: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      person: {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
      },
      partnerRoles: partnerRoles.map((pr) => ({
        id: pr.id,
        label: pr.person
          ? `${pr.person.firstName} ${pr.person.lastName} (${pr.partner.organizationName ?? "—"} — ${pr.roleDescription})`
          : `${pr.partner.organizationName ?? "—"} — ${pr.roleDescription}`,
      })),
    });
  } catch (error) {
    console.error("Failed to validate connector token:", error);
    return NextResponse.json(
      { error: "Failed to validate token" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, partnerRoleId, connectionDate, connectionTime, notes } = body;

    if (!token || !partnerRoleId || !connectionDate) {
      return NextResponse.json(
        { error: "Token, partner role, and date are required" },
        { status: 400 }
      );
    }

    const person = await prisma.people.findUnique({
      where: { connectorToken: token },
      select: { id: true },
    });

    if (!person) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    const connection = await prisma.connection.create({
      data: {
        peopleId: person.id,
        partnerRoleId,
        connectionDate: new Date(connectionDate),
        connectionTime: connectionTime || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    console.error("Failed to create connection:", error);
    return NextResponse.json(
      { error: "Failed to create connection" },
      { status: 500 }
    );
  }
}
