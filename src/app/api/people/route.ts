import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";

export async function GET(request: Request) {
  try {
    const officeFilter = await getOfficeFilterFromRequest(request);
    const people = await prisma.people.findMany({
      where: officeFilter,
      include: {
        partnerRoles: {
          include: {
            partner: true,
          },
        },
        relationships: true,
        connections: true,
      },
    });
    return NextResponse.json(people);
  } catch (error) {
    console.error("Failed to fetch people:", error);
    return NextResponse.json(
      { error: "Failed to fetch people" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();

    // System admins can specify officeId; others get their own
    const officeId = session?.user.role === "SYSTEM_ADMIN" && body.officeId
      ? body.officeId
      : session?.user.officeId;

    const person = await prisma.people.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        phoneNumber: body.phoneNumber,
        personalEmail: body.personalEmail,
        isConnector: body.isConnector ?? false,
        officeId,
      },
    });
    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error("Failed to create person:", error);
    return NextResponse.json(
      { error: "Failed to create person" },
      { status: 500 }
    );
  }
}
