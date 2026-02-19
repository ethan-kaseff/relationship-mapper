import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";

export async function GET(request: Request) {
  try {
    const officeFilter = await getOfficeFilterFromRequest(request);
    const partners = await prisma.partner.findMany({
      where: officeFilter,
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
    const session = await auth();
    const body = await request.json();

    const officeId = session?.user.role === "SYSTEM_ADMIN" && body.officeId
      ? body.officeId
      : session?.user.officeId;

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
        officeId,
      },
    });

    // For individual partners, create a People record and a PartnerRole
    if (body.orgPeopleFlag === "P" && body.organizationName) {
      const nameParts = body.organizationName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const person = await prisma.people.create({
        data: {
          firstName,
          lastName,
          address: body.address,
          city: body.city,
          state: body.state,
          zip: body.zip,
          phoneNumber: body.phoneNumber,
          personalEmail: body.email,
          isConnector: false,
          officeId,
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
