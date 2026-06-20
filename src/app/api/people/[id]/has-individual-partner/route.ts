import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  try {
    const { id } = await params;

    const partnerRole = await prisma.partnerRole.findFirst({
      where: {
        peopleId: id,
        partner: {
          orgPeopleFlag: "P",
        },
      },
    });

    return NextResponse.json({ exists: !!partnerRole });
  } catch (error) {
    console.error("Failed to check individual partner:", error);
    return NextResponse.json(
      { error: "Failed to check individual partner" },
      { status: 500 }
    );
  }
}
