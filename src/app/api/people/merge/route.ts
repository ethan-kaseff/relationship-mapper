import { NextResponse } from "next/server";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

interface MergeBody {
  keeperId: string;
  duplicateId: string;
  fields: {
    firstName: "keeper" | "duplicate";
    middleInitial: "keeper" | "duplicate";
    lastName: "keeper" | "duplicate";
    prefix: "keeper" | "duplicate";
    greeting: "keeper" | "duplicate";
    address: "keeper" | "duplicate";
    city: "keeper" | "duplicate";
    state: "keeper" | "duplicate";
    zip: "keeper" | "duplicate";
    phoneNumber: "keeper" | "duplicate";
    email1: "keeper" | "duplicate";
    email2: "keeper" | "duplicate";
    status: "keeper" | "duplicate";
    isConnector: "keeper" | "duplicate";
  };
}

function pick<T>(keeperVal: T, duplicateVal: T, choice: "keeper" | "duplicate"): T {
  return choice === "keeper" ? keeperVal : duplicateVal;
}

export async function POST(request: Request) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const officeId = (authResult.session.user as { officeId: string }).officeId;
    const body: MergeBody = await request.json();
    const { keeperId, duplicateId, fields } = body;

    if (keeperId === duplicateId) {
      return NextResponse.json({ error: "Cannot merge a person with themselves" }, { status: 400 });
    }

    const [keeper, duplicate] = await Promise.all([
      prisma.people.findUnique({ where: { id: keeperId, officeId } }),
      prisma.people.findUnique({ where: { id: duplicateId, officeId } }),
    ]);

    if (!keeper || !duplicate) {
      return NextResponse.json({ error: "One or both people not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Move relationships (both directions), skipping ones that would create duplicates
      const keeperRelIds = await tx.relationship.findMany({
        where: { OR: [{ peopleId: keeperId }, { targetPersonId: keeperId }] },
        select: { peopleId: true, targetPersonId: true },
      });
      const keeperRelSet = new Set(keeperRelIds.map((r) => `${r.peopleId}:${r.targetPersonId}`));

      const dupRels = await tx.relationship.findMany({
        where: { OR: [{ peopleId: duplicateId }, { targetPersonId: duplicateId }] },
        select: { id: true, peopleId: true, targetPersonId: true },
      });

      for (const rel of dupRels) {
        const newSource = rel.peopleId === duplicateId ? keeperId : rel.peopleId;
        const newTarget = rel.targetPersonId === duplicateId ? keeperId : rel.targetPersonId;
        if (newSource === newTarget) { await tx.relationship.delete({ where: { id: rel.id } }); continue; }
        if (keeperRelSet.has(`${newSource}:${newTarget}`)) { await tx.relationship.delete({ where: { id: rel.id } }); continue; }
        await tx.relationship.update({ where: { id: rel.id }, data: { peopleId: newSource, targetPersonId: newTarget } });
        keeperRelSet.add(`${newSource}:${newTarget}`);
      }

      // Move event invites, skipping events keeper is already invited to
      const keeperEventIds = new Set(
        (await tx.eventInvite.findMany({ where: { peopleId: keeperId }, select: { eventId: true } }))
          .map((i) => i.eventId)
      );
      const dupInvites = await tx.eventInvite.findMany({ where: { peopleId: duplicateId }, select: { id: true, eventId: true } });
      for (const invite of dupInvites) {
        if (keeperEventIds.has(invite.eventId)) {
          await tx.eventInvite.delete({ where: { id: invite.id } });
        } else {
          await tx.eventInvite.update({ where: { id: invite.id }, data: { peopleId: keeperId } });
          keeperEventIds.add(invite.eventId);
        }
      }

      // Move tags, skipping ones keeper already has
      const keeperTagIds = new Set(
        (await tx.personTag.findMany({ where: { personId: keeperId }, select: { tagId: true } }))
          .map((t) => t.tagId)
      );
      const dupTags = await tx.personTag.findMany({ where: { personId: duplicateId }, select: { id: true, tagId: true } });
      for (const tag of dupTags) {
        if (keeperTagIds.has(tag.tagId)) {
          await tx.personTag.delete({ where: { id: tag.id } });
        } else {
          await tx.personTag.update({ where: { id: tag.id }, data: { personId: keeperId } });
          keeperTagIds.add(tag.tagId);
        }
      }

      // Move solicitations, skipping fundraisers keeper is already in
      const keeperFundIds = new Set(
        (await tx.fundraiserSolicitation.findMany({ where: { peopleId: keeperId }, select: { fundraiserId: true } }))
          .map((s) => s.fundraiserId)
      );
      const dupSolicitations = await tx.fundraiserSolicitation.findMany({ where: { peopleId: duplicateId }, select: { id: true, fundraiserId: true } });
      for (const sol of dupSolicitations) {
        if (keeperFundIds.has(sol.fundraiserId)) {
          await tx.fundraiserSolicitation.delete({ where: { id: sol.id } });
        } else {
          await tx.fundraiserSolicitation.update({ where: { id: sol.id }, data: { peopleId: keeperId } });
          keeperFundIds.add(sol.fundraiserId);
        }
      }

      // Move everything with no unique conflict risk
      await tx.partnerRole.updateMany({ where: { peopleId: duplicateId }, data: { peopleId: keeperId } });
      await tx.roleAssignment.updateMany({ where: { peopleId: duplicateId }, data: { peopleId: keeperId } });
      await tx.connection.updateMany({ where: { peopleId: duplicateId }, data: { peopleId: keeperId } });
      await tx.happeningResponse.updateMany({ where: { peopleId: duplicateId }, data: { peopleId: keeperId } });
      await tx.donation.updateMany({ where: { peopleId: duplicateId }, data: { peopleId: keeperId } });
      await tx.emailRecipient.updateMany({ where: { peopleId: duplicateId }, data: { peopleId: keeperId } });
      await tx.personNote.updateMany({ where: { peopleId: duplicateId }, data: { peopleId: keeperId } });

      // Update keeper with chosen field values
      await tx.people.update({
        where: { id: keeperId },
        data: {
          firstName: pick(keeper.firstName, duplicate.firstName, fields.firstName),
          middleInitial: pick(keeper.middleInitial, duplicate.middleInitial, fields.middleInitial),
          lastName: pick(keeper.lastName, duplicate.lastName, fields.lastName),
          prefix: pick(keeper.prefix, duplicate.prefix, fields.prefix),
          greeting: pick(keeper.greeting, duplicate.greeting, fields.greeting),
          address: pick(keeper.address, duplicate.address, fields.address),
          city: pick(keeper.city, duplicate.city, fields.city),
          state: pick(keeper.state, duplicate.state, fields.state),
          zip: pick(keeper.zip, duplicate.zip, fields.zip),
          phoneNumber: pick(keeper.phoneNumber, duplicate.phoneNumber, fields.phoneNumber),
          email1: pick(keeper.email1, duplicate.email1, fields.email1),
          email2: pick(keeper.email2, duplicate.email2, fields.email2),
          status: pick(keeper.status, duplicate.status, fields.status),
          isConnector: pick(keeper.isConnector, duplicate.isConnector, fields.isConnector),
        },
      });

      // Delete the duplicate
      await tx.people.delete({ where: { id: duplicateId } });
    });

    return NextResponse.json({ success: true, keeperId });
  } catch (error) {
    return handleApiError(error);
  }
}
