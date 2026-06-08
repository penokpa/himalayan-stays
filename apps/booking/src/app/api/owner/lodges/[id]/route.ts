import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLodgeAccess } from "@/lib/lodge-access";

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

const NAME_MAX = 120;
const DESCRIPTION_MAX = 4000;
const VILLAGE_MAX = 80;
const DISTRICT_MAX = 80;

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

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
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string | null;
      village?: string;
      district?: string;
      altitudeMeters?: number | string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
      amenities?: Record<string, boolean>;
      isActive?: boolean;
    };

    const data: Record<string, unknown> = {};

    if ("name" in body) {
      const name = clean(body.name, NAME_MAX);
      if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      data.name = name;
    }
    if ("description" in body) {
      data.description = body.description == null ? null : clean(body.description, DESCRIPTION_MAX);
    }
    if ("village" in body) {
      const v = clean(body.village, VILLAGE_MAX);
      if (!v) return NextResponse.json({ error: "Village is required" }, { status: 400 });
      data.village = v;
    }
    if ("district" in body) {
      const v = clean(body.district, DISTRICT_MAX);
      if (!v) return NextResponse.json({ error: "District is required" }, { status: 400 });
      data.district = v;
    }
    if ("altitudeMeters" in body) {
      const v = body.altitudeMeters;
      if (v == null || v === "") data.altitudeMeters = null;
      else {
        const n = typeof v === "string" ? Number(v) : (v as number);
        if (!Number.isFinite(n) || n < 0 || n > 9000) {
          return NextResponse.json({ error: "Altitude must be 0–9000m" }, { status: 400 });
        }
        data.altitudeMeters = Math.round(n);
      }
    }
    if ("latitude" in body) {
      const v = body.latitude;
      if (v == null || v === "") data.latitude = null;
      else {
        const n = typeof v === "string" ? Number(v) : (v as number);
        if (!Number.isFinite(n) || n < -90 || n > 90) {
          return NextResponse.json({ error: "Latitude must be -90 to 90" }, { status: 400 });
        }
        data.latitude = n;
      }
    }
    if ("longitude" in body) {
      const v = body.longitude;
      if (v == null || v === "") data.longitude = null;
      else {
        const n = typeof v === "string" ? Number(v) : (v as number);
        if (!Number.isFinite(n) || n < -180 || n > 180) {
          return NextResponse.json({ error: "Longitude must be -180 to 180" }, { status: 400 });
        }
        data.longitude = n;
      }
    }
    if ("amenities" in body) {
      const a = body.amenities;
      if (!a || typeof a !== "object") {
        data.amenities = {};
      } else {
        const cleaned: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(a)) {
          if (KNOWN_AMENITIES.has(k) && typeof v === "boolean") cleaned[k] = v;
        }
        data.amenities = cleaned;
      }
    }
    if ("isActive" in body && typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await prisma.lodge.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/lodges/[id] error:", err);
    return NextResponse.json({ error: "Failed to update lodge" }, { status: 500 });
  }
}
