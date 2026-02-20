import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, createPartnerSchema } from "@/lib/validations";
import { handleApiError } from "@/lib/api-error";
import { getOfficeFilterFromRequest } from "@/lib/office-filter";

export async function GET(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

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
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createPartnerSchema);
  if (!validation.success) return validation.response;

  try {
    const data = validation.data;

    // System admins can specify officeId; others get their own
    const officeId =
      authResult.session.user.role === "SYSTEM_ADMIN" && data.officeId
        ? data.officeId
        : authResult.session.user.officeId;

    const partner = await prisma.partner.create({
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
        officeId,
      },
    });

    // For individual partners, create a People record and a PartnerRole
    if (data.orgPeopleFlag === "P" && data.organizationName) {
      const nameParts = data.organizationName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const person = await prisma.people.create({
        data: {
          firstName,
          lastName,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          phoneNumber: data.phoneNumber,
          personalEmail: data.email || null,
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
    return handleApiError(error);
  }
}
