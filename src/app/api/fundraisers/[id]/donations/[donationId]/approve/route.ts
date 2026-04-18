import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { validateBody, updateDonationApprovalSchema } from "@/lib/validations";
import { handleApiError, notFound, badRequest } from "@/lib/api-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; donationId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, updateDonationApprovalSchema);
  if (!validation.success) return validation.response;

  try {
    const { donationId } = await params;
    const data = validation.data;

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { fundraiser: { select: { officeId: true } } },
    });
    if (!donation) return notFound("Donation not found");
    if (donation.approvalStatus !== "PENDING") {
      return badRequest("Donation is not pending approval");
    }

    let peopleId = data.peopleId ?? null;

    // Create a new Person if requested
    if (data.createPerson && !peopleId) {
      const officeId = donation.fundraiser.officeId;
      const person = await prisma.people.create({
        data: {
          firstName: data.createPerson.firstName,
          lastName: data.createPerson.lastName,
          email1: data.createPerson.email ?? donation.donorEmail,
          officeId,
        },
      });
      peopleId = person.id;
    }

    const updated = await prisma.donation.update({
      where: { id: donationId },
      data: {
        approvalStatus: data.approvalStatus,
        peopleId,
      },
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
