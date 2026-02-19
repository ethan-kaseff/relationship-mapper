import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const relationship = await prisma.relationship.findUnique({
      where: { id },
      include: {
        person: true,
        partnerRole: {
          include: {
            partner: true,
          },
        },
        relationshipType: true,
      },
    });
    if (!relationship) {
      return NextResponse.json(
        { error: "Relationship not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(relationship);
  } catch (error) {
    console.error("Failed to fetch relationship:", error);
    return NextResponse.json(
      { error: "Failed to fetch relationship" },
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
    const relationship = await prisma.relationship.update({
      where: { id },
      data: {
        peopleId: body.peopleId,
        partnerRoleId: body.partnerRoleId,
        relationshipTypeId: body.relationshipTypeId,
        lastReviewedDate: body.lastReviewedDate
          ? new Date(body.lastReviewedDate)
          : null,
      },
    });
    return NextResponse.json(relationship);
  } catch (error) {
    console.error("Failed to update relationship:", error);
    return NextResponse.json(
      { error: "Failed to update relationship" },
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
    await prisma.relationship.delete({ where: { id } });
    return NextResponse.json({ message: "Relationship deleted" });
  } catch (error) {
    console.error("Failed to delete relationship:", error);
    return NextResponse.json(
      { error: "Failed to delete relationship" },
      { status: 500 }
    );
  }
}
