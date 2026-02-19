import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const relationships = await prisma.relationship.findMany({
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
    return NextResponse.json(relationships);
  } catch (error) {
    console.error("Failed to fetch relationships:", error);
    return NextResponse.json(
      { error: "Failed to fetch relationships" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const relationship = await prisma.relationship.create({
      data: {
        peopleId: body.peopleId,
        partnerRoleId: body.partnerRoleId,
        relationshipTypeId: body.relationshipTypeId,
        lastReviewedDate: body.lastReviewedDate
          ? new Date(body.lastReviewedDate)
          : null,
      },
    });
    return NextResponse.json(relationship, { status: 201 });
  } catch (error) {
    console.error("Failed to create relationship:", error);
    return NextResponse.json(
      { error: "Failed to create relationship" },
      { status: 500 }
    );
  }
}
