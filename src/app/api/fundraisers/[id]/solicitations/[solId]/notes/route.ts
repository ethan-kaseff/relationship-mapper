import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";
import { validateBody, createSolicitationNoteSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; solId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  const validation = await validateBody(request, createSolicitationNoteSchema);
  if (!validation.success) return validation.response;

  try {
    const { id: fundraiserId, solId } = await params;
    const solicitation = await prisma.fundraiserSolicitation.findFirst({
      where: { id: solId, fundraiserId },
    });
    if (!solicitation) return notFound("Solicitation not found");

    const note = await prisma.solicitationNote.create({
      data: {
        content: validation.data.content,
        solicitationId: solId,
        authorId: authResult.session.user.id,
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
