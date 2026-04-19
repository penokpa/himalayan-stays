import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TrekRoute } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const trekRoute = searchParams.get("trekRoute");

    const where: { isActive: boolean; trekRoute?: TrekRoute } = {
      isActive: true,
    };

    if (trekRoute && Object.values(TrekRoute).includes(trekRoute as TrekRoute)) {
      where.trekRoute = trekRoute as TrekRoute;
    }

    const includeRooms = searchParams.get("includeRooms") === "true";

    const lodges = await prisma.lodge.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        village: true,
        description: true,
        amenities: true,
        altitudeMeters: true,
        trekRoute: true,
        trailPosition: true,
        photos: true,
        ...(includeRooms && {
          rooms: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              roomType: true,
              capacity: true,
              basePriceNpr: true,
              floor: true,
            },
            orderBy: { name: "asc" as const },
          },
        }),
      },
      orderBy: { trailPosition: "asc" },
    });

    // Return only the first photo for each lodge
    const result = lodges.map((lodge) => ({
      ...lodge,
      photo: lodge.photos[0] ?? null,
      photos: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/lodges error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lodges" },
      { status: 500 }
    );
  }
}
