import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const people = await prisma.people.findMany({
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
    const body = await request.json();
    const person = await prisma.people.create({
      data: {
        fullName: body.fullName,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        phoneNumber: body.phoneNumber,
        personalEmail: body.personalEmail,
        isConnector: body.isConnector ?? false,
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
