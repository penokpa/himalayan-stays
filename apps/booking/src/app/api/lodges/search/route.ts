import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_RESULTS = 8;
const MIN_QUERY = 2;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < MIN_QUERY) {
      return NextResponse.json({ results: [] });
    }

    const lodges = await prisma.lodge.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { village: { contains: q, mode: "insensitive" } },
          { district: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: [{ trailPosition: "asc" }, { name: "asc" }],
      take: MAX_RESULTS,
      select: {
        id: true,
        name: true,
        slug: true,
        village: true,
        district: true,
        altitudeMeters: true,
        trekRoute: true,
        photos: true,
      },
    });

    const results = lodges.map((l) => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      village: l.village,
      district: l.district,
      altitudeMeters: l.altitudeMeters,
      trekRoute: l.trekRoute,
      photo: l.photos[0] ?? null,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("GET /api/lodges/search error:", err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
