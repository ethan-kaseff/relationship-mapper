import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const partnerRoles = await prisma.partnerRole.findMany({
      include: {
        partner: true,
        person: true,
      },
    });
    return NextResponse.json(partnerRoles);
  } catch (error) {
    console.error("Failed to fetch partner roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const partnerRole = await prisma.partnerRole.create({
      data: {
        partnerId: body.partnerId,
        roleDescription: body.roleDescription,
        peopleId: body.peopleId,
      },
    });
    return NextResponse.json(partnerRole, { status: 201 });
  } catch (error) {
    console.error("Failed to create partner role:", error);
    return NextResponse.json(
      { error: "Failed to create partner role" },
      { status: 500 }
    );
  }
}
