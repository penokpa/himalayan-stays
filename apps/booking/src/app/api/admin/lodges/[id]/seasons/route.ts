import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLodgeAccess } from "@/lib/lodge-access";
import { Season } from "@prisma/client";

const VALID_SEASONS: Season[] = ["PEAK", "SHOULDER", "OFF", "FESTIVAL"];

interface SeasonGroup {
  season: Season;
  startDate: string;
  endDate: string;
  roomCount: number;
  minPriceNpr: number;
  maxPriceNpr: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await checkLodgeAccess(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const rows = await prisma.seasonPricing.findMany({
    where: { room: { lodgeId: id } },
    orderBy: [{ startDate: "asc" }, { season: "asc" }],
  });

  // Group by (season, startDate, endDate)
  const groups = new Map<string, SeasonGroup>();
  for (const r of rows) {
    const key = `${r.season}|${r.startDate.toISOString().slice(0, 10)}|${r.endDate.toISOString().slice(0, 10)}`;
    const price = r.priceNpr.toNumber();
    const existing = groups.get(key);
    if (existing) {
      existing.roomCount += 1;
      existing.minPriceNpr = Math.min(existing.minPriceNpr, price);
      existing.maxPriceNpr = Math.max(existing.maxPriceNpr, price);
    } else {
      groups.set(key, {
        season: r.season,
        startDate: r.startDate.toISOString().slice(0, 10),
        endDate: r.endDate.toISOString().slice(0, 10),
        roomCount: 1,
        minPriceNpr: price,
        maxPriceNpr: price,
      });
    }
  }

  return NextResponse.json({ groups: Array.from(groups.values()) });
}

export async function POST(
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
    const { season, startDate, endDate, multiplier } = body as {
      season: string;
      startDate: string;
      endDate: string;
      multiplier: number;
    };

    if (!VALID_SEASONS.includes(season as Season)) {
      return NextResponse.json(
        { error: `season must be one of ${VALID_SEASONS.join(", ")}` },
        { status: 400 }
      );
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json(
        { error: "endDate must be on or after startDate" },
        { status: 400 }
      );
    }
    if (typeof multiplier !== "number" || multiplier <= 0 || multiplier > 10) {
      return NextResponse.json(
        { error: "multiplier must be a number between 0 and 10" },
        { status: 400 }
      );
    }

    const rooms = await prisma.room.findMany({
      where: { lodgeId: id, isActive: true },
      select: { id: true, basePriceNpr: true },
    });

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: "Lodge has no active rooms" },
        { status: 400 }
      );
    }

    // Refuse duplicate group
    const existing = await prisma.seasonPricing.findFirst({
      where: {
        roomId: { in: rooms.map((r) => r.id) },
        season: season as Season,
        startDate: start,
        endDate: end,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A season block with this exact season + date range already exists. Delete it first." },
        { status: 409 }
      );
    }

    await prisma.seasonPricing.createMany({
      data: rooms.map((r) => ({
        roomId: r.id,
        season: season as Season,
        startDate: start,
        endDate: end,
        priceNpr: Math.round(r.basePriceNpr.toNumber() * multiplier),
      })),
    });

    return NextResponse.json({ ok: true, created: rooms.length });
  } catch (error) {
    console.error("POST /api/admin/lodges/[id]/seasons error:", error);
    return NextResponse.json(
      { error: "Failed to create season block" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const { season, startDate, endDate } = body as {
      season: string;
      startDate: string;
      endDate: string;
    };
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const rooms = await prisma.room.findMany({
      where: { lodgeId: id },
      select: { id: true },
    });

    const result = await prisma.seasonPricing.deleteMany({
      where: {
        roomId: { in: rooms.map((r) => r.id) },
        season: season as Season,
        startDate: start,
        endDate: end,
      },
    });

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error) {
    console.error("DELETE /api/admin/lodges/[id]/seasons error:", error);
    return NextResponse.json(
      { error: "Failed to delete season block" },
      { status: 500 }
    );
  }
}
