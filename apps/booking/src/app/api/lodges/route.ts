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
    const includeMinPrice = searchParams.get("includeMinPrice") === "true";

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
        ...(includeRooms
          ? {
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
            }
          : includeMinPrice
            ? {
                rooms: {
                  where: { isActive: true },
                  select: { basePriceNpr: true },
                },
              }
            : {}),
        ...(includeMinPrice && {
          reviews: { select: { rating: true } },
        }),
      },
      orderBy: { trailPosition: "asc" },
    });

    // Return only the first photo for each lodge; compute min price + rating summary
    // when requested so clients don't have to ship the full room/review payload.
    const result = lodges.map((lodge) => {
      const base = {
        ...lodge,
        photo: lodge.photos[0] ?? null,
        photos: undefined,
      };
      if (includeMinPrice && !includeRooms) {
        const rooms = (lodge as unknown as { rooms?: { basePriceNpr: number | string }[] }).rooms ?? [];
        const reviews = (lodge as unknown as { reviews?: { rating: number }[] }).reviews ?? [];
        const minPriceNpr =
          rooms.length > 0 ? Math.min(...rooms.map((r) => Number(r.basePriceNpr))) : null;
        const roomCount = rooms.length;
        const reviewCount = reviews.length;
        const avgRating =
          reviewCount > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : null;
        return {
          ...base,
          rooms: undefined,
          reviews: undefined,
          minPriceNpr,
          roomCount,
          avgRating,
          reviewCount,
        };
      }
      return base;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/lodges error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lodges" },
      { status: 500 }
    );
  }
}
