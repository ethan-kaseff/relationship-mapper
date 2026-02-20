import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";

export async function GET(request: Request) {
  try {
    const officeFilter = await getOfficeFilterFromRequest(request);
    const personFilter = officeFilter.officeId ? { person: { officeId: officeFilter.officeId } } : {};
    const relationships = await prisma.relationship.findMany({
      where: personFilter,
      include: {
        person: true,
        targetPerson: true,
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

    // If targetPersonId not provided, look it up from the partner role
    let targetPersonId = body.targetPersonId;
    if (!targetPersonId && body.partnerRoleId) {
      const role = await prisma.partnerRole.findUnique({
        where: { id: body.partnerRoleId },
      });
      targetPersonId = role?.peopleId;
    }

    if (!targetPersonId) {
      return NextResponse.json(
        { error: "Could not determine target person" },
        { status: 400 }
      );
    }

    const relationship = await prisma.relationship.create({
      data: {
        peopleId: body.peopleId,
        targetPersonId,
        partnerRoleId: body.partnerRoleId || null,
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
