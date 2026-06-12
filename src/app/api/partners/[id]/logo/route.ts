import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireNonConnector } from "@/lib/api-auth";
import { handleApiError, notFound } from "@/lib/api-error";
import { getOfficeFilter } from "@/lib/office-filter";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"];
const MAX_SIZE = 4 * 1024 * 1024; // 4MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const officeFilter = await getOfficeFilter();
    const partner = await prisma.partner.findFirst({ where: { id, ...officeFilter } });
    if (!partner) return notFound("Partner not found");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File must be an image (PNG, JPEG, SVG, WebP, or GIF)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File must be under 4MB" }, { status: 400 });
    }

    const blob = await put(`partner-logos/${id}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    // Replace any previous logo so old files don't pile up
    if (partner.logoUrl) {
      try {
        await del(partner.logoUrl);
      } catch {
        // Old blob may already be gone — not a problem
      }
    }

    const updated = await prisma.partner.update({
      where: { id },
      data: { logoUrl: blob.url },
    });

    return NextResponse.json({ logoUrl: updated.logoUrl });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireNonConnector();
  if (!authResult.success) return authResult.response;

  try {
    const { id } = await params;
    const officeFilter = await getOfficeFilter();
    const partner = await prisma.partner.findFirst({ where: { id, ...officeFilter } });
    if (!partner) return notFound("Partner not found");

    if (partner.logoUrl) {
      try {
        await del(partner.logoUrl);
      } catch {
        // Blob already gone — still clear the reference
      }
      await prisma.partner.update({ where: { id }, data: { logoUrl: null } });
    }

    return NextResponse.json({ message: "Logo removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
