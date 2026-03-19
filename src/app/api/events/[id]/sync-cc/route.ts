import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { notFound, badRequest } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";
import { isConnected, createContactList, upsertContacts } from "@/lib/constant-contact";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const officeId = (authResult.session.user as { officeId: string }).officeId;

    // Check CC connection
    const connected = await isConnected(officeId);
    if (!connected) {
      return badRequest("Constant Contact not connected. Connect from Settings.");
    }

    // Get event with invites and people data
    const officeFilter = await getOfficeFilter();
    const event = await prisma.event.findFirst({
      where: { id, ...officeFilter },
      include: {
        invites: {
          include: {
            person: {
              select: {
                firstName: true,
                lastName: true,
                email1: true,
                email2: true,
              },
            },
          },
        },
      },
    });

    if (!event) return notFound("Event not found");

    // Split invites into those with and without emails
    const withEmail = event.invites.filter((inv) => inv.person.email1?.trim() || inv.person.email2?.trim());
    const withoutEmail = event.invites.filter((inv) => !inv.person.email1?.trim() && !inv.person.email2?.trim());

    if (withEmail.length === 0) {
      return NextResponse.json({
        synced: 0,
        skipped: event.invites.length,
        message: "No invitees have email addresses. Add emails to people records before syncing.",
      });
    }

    // Always create a new CC list with sequential numbering
    const nextSyncCount = event.ccSyncCount + 1;
    const listName = nextSyncCount === 1
      ? event.title
      : `${event.title} ${nextSyncCount}`;
    const listId = await createContactList(officeId, listName);

    await prisma.event.update({
      where: { id: event.id },
      data: { ccListId: listId, ccSyncCount: nextSyncCount },
    });

    // Build contacts from invites
    const contacts = withEmail.map((inv) => ({
      email: (inv.person.email1?.trim() || inv.person.email2?.trim())!,
      first_name: inv.person.firstName,
      last_name: inv.person.lastName,
    }));

    await upsertContacts(officeId, contacts, listId);

    return NextResponse.json({
      synced: withEmail.length,
      skipped: withoutEmail.length,
      listId,
      message: `Synced ${withEmail.length} contacts to Constant Contact.${
        withoutEmail.length > 0
          ? ` ${withoutEmail.length} invitees skipped (no email).`
          : ""
      }`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
