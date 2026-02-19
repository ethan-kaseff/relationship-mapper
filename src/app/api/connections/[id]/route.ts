import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connection = await prisma.connection.findUnique({
      where: { id },
      include: {
        person: true,
        partnerRole: {
          include: {
            partner: true,
          },
        },
      },
    });
    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(connection);
  } catch (error) {
    console.error("Failed to fetch connection:", error);
    return NextResponse.json(
      { error: "Failed to fetch connection" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const connection = await prisma.connection.update({
      where: { id },
      data: {
        peopleId: body.peopleId,
        partnerRoleId: body.partnerRoleId,
        connectionDate: body.connectionDate
          ? new Date(body.connectionDate)
          : undefined,
        connectionTime: body.connectionTime,
        notes: body.notes,
      },
    });
    return NextResponse.json(connection);
  } catch (error) {
    console.error("Failed to update connection:", error);
    return NextResponse.json(
      { error: "Failed to update connection" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.connection.delete({ where: { id } });
    return NextResponse.json({ message: "Connection deleted" });
  } catch (error) {
    console.error("Failed to delete connection:", error);
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
