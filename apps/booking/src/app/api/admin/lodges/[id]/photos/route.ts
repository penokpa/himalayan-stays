import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLodgeAccess } from "@/lib/lodge-access";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await checkLodgeAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  try {
    const body = await request.json();
    const { photos } = body as { photos: string[] };

    if (!Array.isArray(photos)) {
      return NextResponse.json(
        { error: "photos must be an array of URL strings" },
        { status: 400 }
      );
    }

    // Validate URLs
    const cleaned = photos
      .map((p) => (typeof p === "string" ? p.trim() : ""))
      .filter((p) => p.length > 0);

    for (const url of cleaned) {
      try {
        const u = new URL(url);
        if (u.protocol !== "https:" && u.protocol !== "http:") {
          throw new Error("Only http(s) URLs allowed");
        }
      } catch {
        return NextResponse.json(
          { error: `Invalid URL: ${url}` },
          { status: 400 }
        );
      }
    }

    const lodge = await prisma.lodge.update({
      where: { id },
      data: { photos: cleaned },
      select: { id: true, photos: true },
    });

    return NextResponse.json({ lodge });
  } catch (error) {
    console.error("PATCH /api/admin/lodges/[id]/photos error:", error);
    return NextResponse.json(
      { error: "Failed to update photos" },
      { status: 500 }
    );
  }
}
