import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const relationshipTypes = await prisma.relationshipType.findMany({
      include: { _count: { select: { relationships: true } } },
    });
    return NextResponse.json(relationshipTypes);
  } catch (error) {
    console.error("Failed to fetch relationship types:", error);
    return NextResponse.json(
      { error: "Failed to fetch relationship types" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const relType = await prisma.relationshipType.create({
      data: {
        relationshipDesc: body.relationshipDesc,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(relType, { status: 201 });
  } catch (error) {
    console.error("Failed to create relationship type:", error);
    return NextResponse.json(
      { error: "Failed to create relationship type" },
      { status: 500 }
    );
  }
}
