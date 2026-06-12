import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; solId: string; noteId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id: fundraiserId, solId, noteId } = await params;
    const note = await prisma.solicitationNote.findFirst({
      where: { id: noteId, solicitationId: solId, solicitation: { fundraiserId } },
    });
    if (!note) return notFound("Note not found");

    await prisma.solicitationNote.delete({ where: { id: noteId } });
    return NextResponse.json({ message: "Note deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
