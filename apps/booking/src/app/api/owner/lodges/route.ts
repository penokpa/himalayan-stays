import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const TREK_ROUTES = new Set(["EBC", "ABC", "LANGTANG", "MANASLU", "UPPER_MUSTANG"]);
const KNOWN_AMENITIES = new Set([
  "wifi",
  "hotShower",
  "charging",
  "restaurant",
  "bar",
  "bakery",
  "heater",
  "oxygenAvailable",
  "garden",
  "library",
]);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let candidate = base || "lodge";
  let n = 1;
  while (await prisma.lodge.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || (role !== "LODGE_OWNER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      trekRoute?: string;
      village?: string;
      district?: string;
      altitudeMeters?: number | string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
      amenities?: Record<string, boolean>;
      ownerId?: string; // admin only
    };

    const name = body.name?.trim();
    const village = body.village?.trim();
    const district = body.district?.trim();
    const trekRoute = body.trekRoute;

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!village) return NextResponse.json({ error: "Village is required" }, { status: 400 });
    if (!district) return NextResponse.json({ error: "District is required" }, { status: 400 });
    if (!trekRoute || !TREK_ROUTES.has(trekRoute)) {
      return NextResponse.json({ error: "Valid trekRoute is required" }, { status: 400 });
    }

    // Numeric validation
    function parseNum(v: number | string | null | undefined, min: number, max: number): number | null {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "string" ? Number(v) : v;
      if (!Number.isFinite(n) || n < min || n > max) {
        throw new Error(`out_of_range_${min}_${max}`);
      }
      return n;
    }

    let altitudeMeters: number | null;
    let latitude: number | null;
    let longitude: number | null;
    try {
      altitudeMeters = parseNum(body.altitudeMeters, 0, 9000);
      latitude = parseNum(body.latitude, -90, 90);
      longitude = parseNum(body.longitude, -180, 180);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid number" },
        { status: 400 }
      );
    }

    // Amenities — filter to known keys
    const cleanedAmenities: Record<string, boolean> = {};
    if (body.amenities && typeof body.amenities === "object") {
      for (const [k, v] of Object.entries(body.amenities)) {
        if (KNOWN_AMENITIES.has(k) && typeof v === "boolean") cleanedAmenities[k] = v;
      }
    }

    // Owner — owner always creates for themselves; admin can pass ownerId to assign
    const ownerId =
      role === "ADMIN" && body.ownerId ? body.ownerId : userId;
    if (role === "ADMIN" && body.ownerId) {
      const exists = await prisma.user.findUnique({
        where: { id: body.ownerId },
        select: { id: true, role: true },
      });
      if (!exists) {
        return NextResponse.json({ error: "ownerId not found" }, { status: 400 });
      }
    }

    // Slug — derived from name, uniqueness-protected
    const baseSlug = slugify(name);
    const slug = await ensureUniqueSlug(baseSlug);

    // Trail position — auto-pick next on the route (so the new lodge appears at the end)
    const maxPos = await prisma.lodge.aggregate({
      where: { trekRoute: trekRoute as Prisma.LodgeWhereInput["trekRoute"] },
      _max: { trailPosition: true },
    });
    const trailPosition = (maxPos._max.trailPosition ?? 0) + 1;

    const lodge = await prisma.lodge.create({
      data: {
        name: name.slice(0, 120),
        slug,
        description: body.description?.trim().slice(0, 4000) || null,
        altitudeMeters,
        latitude,
        longitude,
        trekRoute: trekRoute as Prisma.LodgeCreateInput["trekRoute"],
        trailPosition,
        village: village.slice(0, 80),
        district: district.slice(0, 80),
        ownerId,
        managedBy: "OWNER",
        amenities: cleanedAmenities,
        photos: [],
        // Owners create as inactive by default so they can add rooms + photos first
        isActive: role === "ADMIN",
      },
      select: { id: true, slug: true },
    });

    return NextResponse.json({ ok: true, lodge }, { status: 201 });
  } catch (err) {
    console.error("POST /api/owner/lodges error:", err);
    return NextResponse.json({ error: "Failed to create lodge" }, { status: 500 });
  }
}
