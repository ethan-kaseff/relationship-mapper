import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const connections = await prisma.connection.findMany({
      include: {
        person: true,
        partnerRole: {
          include: {
            partner: true,
          },
        },
      },
    });
    return NextResponse.json(connections);
  } catch (error) {
    console.error("Failed to fetch connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const connection = await prisma.connection.create({
      data: {
        peopleId: body.peopleId,
        partnerRoleId: body.partnerRoleId,
        connectionDate: new Date(body.connectionDate),
        connectionTime: body.connectionTime,
        notes: body.notes,
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
