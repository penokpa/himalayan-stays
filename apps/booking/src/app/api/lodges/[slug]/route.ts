import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const lodge = await prisma.lodge.findUnique({
      where: { slug },
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!lodge) {
      return NextResponse.json({ error: "Lodge not found" }, { status: 404 });
    }

    const { rooms, ...lodgeData } = lodge;
    return NextResponse.json({ lodge: lodgeData, rooms });
  } catch (error) {
    console.error("GET /api/lodges/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lodge" },
      { status: 500 }
    );
  }
}
