import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "apiKey is required" },
        { status: 400 }
      );
    }

    // Validate API key against LodgeDevice table
    const device = await prisma.lodgeDevice.findUnique({
      where: { apiKey },
      include: {
        lodge: {
          include: {
            rooms: {
              where: { isActive: true },
              orderBy: { name: "asc" },
            },
            menuCategories: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              include: {
                items: {
                  where: { isActive: true },
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!device || !device.isActive) {
      return NextResponse.json(
        { error: "Invalid or inactive API key" },
        { status: 401 }
      );
    }

    const { lodge } = device;

    return NextResponse.json({
      lodge: {
        id: lodge.id,
        name: lodge.name,
        slug: lodge.slug,
        village: lodge.village,
        district: lodge.district,
        altitudeMeters: lodge.altitudeMeters,
        trekRoute: lodge.trekRoute,
        trailPosition: lodge.trailPosition,
      },
      rooms: lodge.rooms,
      menuCategories: lodge.menuCategories,
    });
  } catch (error) {
    console.error("POST /api/pms/setup error:", error);
    return NextResponse.json(
      { error: "Failed to fetch setup data" },
      { status: 500 }
    );
  }
}
