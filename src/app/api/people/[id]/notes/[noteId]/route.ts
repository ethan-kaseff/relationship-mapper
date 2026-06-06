import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id, noteId } = await params;
    const note = await prisma.personNote.findFirst({
      where: { id: noteId, peopleId: id },
    });
    if (!note) return notFound("Note not found");

    await prisma.personNote.delete({ where: { id: noteId } });
    return NextResponse.json({ message: "Note deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
