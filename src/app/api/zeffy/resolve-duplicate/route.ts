import { NextResponse } from "next/server";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import type { PendingDuplicate } from "@/lib/zeffy";

interface ResolveBody {
  action: "link" | "create";
  zeffyContact: PendingDuplicate["zeffyContact"];
  existingPersonId?: string;
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const body: ResolveBody = await request.json();
    const { action, zeffyContact, existingPersonId } = body;

    if (action === "link" && existingPersonId) {
      // Add Zeffy's email to the existing person so future syncs match correctly
      const existing = await prisma.people.findUnique({
        where: { id: existingPersonId },
        select: { email1: true, email2: true },
      });
      if (!existing) return NextResponse.json({ error: "Person not found" }, { status: 404 });

      const updateData = !existing.email1
        ? { email1: zeffyContact.email }
        : !existing.email2
        ? { email2: zeffyContact.email }
        : {};

      await prisma.people.update({ where: { id: existingPersonId }, data: updateData });
      return NextResponse.json({ action: "linked" });
    }

    if (action === "create") {
      await prisma.people.create({
        data: {
          firstName: zeffyContact.firstName,
          lastName: zeffyContact.lastName,
          email1: zeffyContact.email,
          phoneNumber: zeffyContact.phoneNumber,
          address: zeffyContact.address,
          city: zeffyContact.city,
          state: zeffyContact.state,
          zip: zeffyContact.zip,
          officeId,
        },
      });
      return NextResponse.json({ action: "created" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
