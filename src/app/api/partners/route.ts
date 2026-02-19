import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      include: {
        organizationType: true,
        partnerRoles: {
          include: {
            person: true,
          },
        },
      },
    });
    return NextResponse.json(partners);
  } catch (error) {
    console.error("Failed to fetch partners:", error);
    return NextResponse.json(
      { error: "Failed to fetch partners" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const partner = await prisma.partner.create({
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

    // For individual partners, create a People record and a PartnerRole
    if (body.orgPeopleFlag === "P" && body.organizationName) {
      const person = await prisma.people.create({
        data: {
          fullName: body.organizationName,
          address: body.address,
          city: body.city,
          state: body.state,
          zip: body.zip,
          phoneNumber: body.phoneNumber,
          personalEmail: body.email,
          isConnector: false,
        },
      });

      await prisma.partnerRole.create({
        data: {
          partnerId: partner.id,
          roleDescription: "Primary Contact",
          peopleId: person.id,
        },
      });
    }

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error("Failed to create partner:", error);
    return NextResponse.json(
      { error: "Failed to create partner" },
      { status: 500 }
    );
  }
}
