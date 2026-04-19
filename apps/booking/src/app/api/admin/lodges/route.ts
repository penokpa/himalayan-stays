import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const lodges = await prisma.lodge.findMany({
      orderBy: [{ trekRoute: "asc" }, { trailPosition: "asc" }],
      include: {
        _count: { select: { rooms: true, bookingLegs: true } },
      },
    });

    return NextResponse.json(lodges);
  } catch (error) {
    console.error("GET /api/admin/lodges error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lodges" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const {
      name,
      slug,
      description,
      altitudeMeters,
      latitude,
      longitude,
      trekRoute,
      trailPosition,
      village,
      district,
      ownerId,
      managedBy,
      amenities,
      photos,
    } = body;

    if (!name || !slug || !trekRoute || !village || !district || !ownerId || trailPosition == null) {
      return NextResponse.json(
        { error: "Missing required fields: name, slug, trekRoute, trailPosition, village, district, ownerId" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.lodge.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A lodge with this slug already exists" },
        { status: 409 }
      );
    }

    const lodge = await prisma.lodge.create({
      data: {
        name,
        slug,
        description: description ?? null,
        altitudeMeters: altitudeMeters ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        trekRoute,
        trailPosition,
        village,
        district,
        ownerId,
        managedBy: managedBy ?? "OWNER",
        amenities: amenities ?? null,
        photos: photos ?? [],
      },
    });

    return NextResponse.json(lodge, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/lodges error:", error);
    return NextResponse.json(
      { error: "Failed to create lodge" },
      { status: 500 }
    );
  }
}
