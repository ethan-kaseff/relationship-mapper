import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        organizationType: true,
        partnerRoles: {
          include: {
            person: true,
            relationships: true,
            connections: true,
          },
        },
      },
    });
    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(partner);
  } catch (error) {
    console.error("Failed to fetch partner:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner" },
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
    const partner = await prisma.partner.update({
      where: { id },
      data: {
        orgPeopleFlag: body.orgPeopleFlag,
        organizationName: body.organizationName,
        organizationTypeId: body.organizationTypeId,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        phoneNumber: body.phoneNumber,
        email: body.email,
        website: body.website,
      },
    });
    return NextResponse.json(partner);
  } catch (error) {
    console.error("Failed to update partner:", error);
    return NextResponse.json(
      { error: "Failed to update partner" },
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
    await prisma.partner.delete({ where: { id } });
    return NextResponse.json({ message: "Partner deleted" });
  } catch (error) {
    console.error("Failed to delete partner:", error);
    return NextResponse.json(
      { error: "Failed to delete partner" },
      { status: 500 }
    );
  }
}
