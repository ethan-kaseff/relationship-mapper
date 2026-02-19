import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const organizationTypes = await prisma.organizationType.findMany();
    return NextResponse.json(organizationTypes);
  } catch (error) {
    console.error("Failed to fetch organization types:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization types" },
      { status: 500 }
    );
  }
}
