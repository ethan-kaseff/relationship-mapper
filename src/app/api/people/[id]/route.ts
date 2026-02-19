import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const person = await prisma.people.findUnique({
      where: { id },
      include: {
        partnerRoles: {
          include: {
            partner: true,
          },
        },
        relationships: {
          include: {
            partnerRole: {
              include: {
                partner: true,
              },
            },
            relationshipType: true,
          },
        },
        connections: {
          include: {
            partnerRole: {
              include: {
                partner: true,
              },
            },
          },
        },
        eventResponses: {
          include: {
            event: true,
          },
        },
      },
    });
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (error) {
    console.error("Failed to fetch person:", error);
    return NextResponse.json(
      { error: "Failed to fetch person" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role === "CONNECTOR") {
      return NextResponse.json({ error: "Connectors cannot edit people" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const person = await prisma.people.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        phoneNumber: body.phoneNumber,
        personalEmail: body.personalEmail,
        isConnector: body.isConnector,
      },
    });
    return NextResponse.json(person);
  } catch (error) {
    console.error("Failed to update person:", error);
    return NextResponse.json(
      { error: "Failed to update person" },
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

    // Delete related records first (no cascade in schema)
    await prisma.eventResponse.deleteMany({ where: { peopleId: id } });
    await prisma.connection.deleteMany({ where: { peopleId: id } });
    await prisma.relationship.deleteMany({ where: { peopleId: id } });
    // Unlink from partner roles (don't delete the roles themselves)
    await prisma.partnerRole.updateMany({
      where: { peopleId: id },
      data: { peopleId: null },
    });

    await prisma.people.delete({ where: { id } });
    return NextResponse.json({ message: "Person deleted" });
  } catch (error) {
    console.error("Failed to delete person:", error);
    return NextResponse.json(
      { error: "Failed to delete person" },
      { status: 500 }
    );
  }
}
