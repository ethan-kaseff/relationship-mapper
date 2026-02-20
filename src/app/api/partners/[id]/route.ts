import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updatePartnerSchema } from "@/lib/validations";
import { handleApiError, notFound } from "@/lib/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

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
      return notFound("Partner not found");
    }
    return NextResponse.json(partner);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updatePartnerSchema);
  if (!validation.success) return validation.response;

  try {
    const { id } = await params;
    const data = validation.data;
    const partner = await prisma.partner.update({
      where: { id },
      data: {
        orgPeopleFlag: data.orgPeopleFlag,
        organizationName: data.organizationName,
        organizationTypeId: data.organizationTypeId,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        phoneNumber: data.phoneNumber,
        email: data.email || null,
        website: data.website || null,
      },
    });
    return NextResponse.json(partner);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    await prisma.partner.delete({ where: { id } });
    return NextResponse.json({ message: "Partner deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
