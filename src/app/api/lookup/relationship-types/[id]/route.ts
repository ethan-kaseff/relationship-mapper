import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const reassignTo = url.searchParams.get("reassignTo");

    const count = await prisma.relationship.count({
      where: { relationshipTypeId: id },
    });

    if (count > 0 && !reassignTo) {
      return NextResponse.json(
        { error: "in_use", count },
        { status: 409 }
      );
    }

    if (count > 0 && reassignTo) {
      await prisma.relationship.updateMany({
        where: { relationshipTypeId: id },
        data: { relationshipTypeId: reassignTo },
      });
    }

    await prisma.relationshipType.delete({ where: { id } });
    return NextResponse.json({ message: "Relationship type deleted" });
  } catch (error) {
    console.error("Failed to delete relationship type:", error);
    return NextResponse.json(
      { error: "Failed to delete relationship type" },
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
    const relType = await prisma.relationshipType.update({
      where: { id },
      data: {
        relationshipDesc: body.relationshipDesc,
        notes: body.notes,
      },
    });
    return NextResponse.json(relType);
  } catch (error) {
    console.error("Failed to update relationship type:", error);
    return NextResponse.json(
      { error: "Failed to update relationship type" },
      { status: 500 }
    );
  }
}
