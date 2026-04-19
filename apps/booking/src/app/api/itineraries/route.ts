import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TrekRoute } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const trekRoute = searchParams.get("trekRoute");

    if (!trekRoute || !Object.values(TrekRoute).includes(trekRoute as TrekRoute)) {
      return NextResponse.json(
        { error: "Valid trekRoute is required" },
        { status: 400 }
      );
    }

    const itineraries = await prisma.itinerary.findMany({
      where: {
        isTemplate: true,
        trekRoute: trekRoute as TrekRoute,
      },
      include: {
        stops: {
          orderBy: { dayNumber: "asc" },
          include: {
            lodge: {
              select: {
                id: true,
                name: true,
                slug: true,
                village: true,
                altitudeMeters: true,
                trailPosition: true,
                photos: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = itineraries.map((itin) => ({
      id: itin.id,
      name: itin.name,
      trekRoute: itin.trekRoute,
      totalDays: itin.totalDays,
      description: itin.description,
      stops: itin.stops.map((stop) => ({
        id: stop.id,
        dayNumber: stop.dayNumber,
        nights: stop.nights,
        notes: stop.notes,
        lodge: {
          ...stop.lodge,
          photo: stop.lodge.photos[0] ?? null,
          photos: undefined,
        },
      })),
    }));

    return NextResponse.json({ itineraries: result });
  } catch (error) {
    console.error("GET /api/itineraries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch itineraries" },
      { status: 500 }
    );
  }
}
