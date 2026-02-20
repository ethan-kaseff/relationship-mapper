import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createPeopleSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

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
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createPeopleSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;
    const person = await prisma.people.create({
      data: {
        fullName: data.fullName,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        phoneNumber: data.phoneNumber,
        personalEmail: data.personalEmail || null,
        isConnector: data.isConnector ?? false,
      },
    });
    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
