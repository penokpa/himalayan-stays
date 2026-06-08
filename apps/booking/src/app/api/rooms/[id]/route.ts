import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLodgeAccess } from "@/lib/lodge-access";

const NAME_MAX = 80;

const ROOM_TYPES = new Set([
  "PRIVATE_SINGLE",
  "PRIVATE_DOUBLE",
  "PRIVATE_TWIN",
  "DORM",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const room = await prisma.room.findUnique({
    where: { id },
    select: { lodgeId: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const access = await checkLodgeAccess(room.lodgeId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      roomType?: string;
      capacity?: number | string;
      basePriceNpr?: number | string;
      floor?: number | string | null;
      isActive?: boolean;
    };

    const data: Record<string, unknown> = {};

    if ("name" in body) {
      const v = typeof body.name === "string" ? body.name.trim().slice(0, NAME_MAX) : "";
      if (!v) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      data.name = v;
    }
    if ("roomType" in body) {
      if (typeof body.roomType !== "string" || !ROOM_TYPES.has(body.roomType)) {
        return NextResponse.json({ error: "Invalid room type" }, { status: 400 });
      }
      data.roomType = body.roomType;
    }
    if ("capacity" in body) {
      const n = typeof body.capacity === "string" ? Number(body.capacity) : body.capacity;
      if (!Number.isFinite(n) || n == null || n < 1 || n > 50) {
        return NextResponse.json({ error: "Capacity must be 1–50" }, { status: 400 });
      }
      data.capacity = Math.round(n as number);
    }
    if ("basePriceNpr" in body) {
      const n = typeof body.basePriceNpr === "string" ? Number(body.basePriceNpr) : body.basePriceNpr;
      if (!Number.isFinite(n) || n == null || n < 0) {
        return NextResponse.json({ error: "Price must be ≥ 0" }, { status: 400 });
      }
      data.basePriceNpr = n;
    }
    if ("floor" in body) {
      const v = body.floor;
      if (v === null || v === "") data.floor = null;
      else {
        const n = typeof v === "string" ? Number(v) : v;
        if (!Number.isFinite(n) || (n as number) < -2 || (n as number) > 20) {
          return NextResponse.json({ error: "Floor must be -2 to 20" }, { status: 400 });
        }
        data.floor = Math.round(n as number);
      }
    }
    if ("isActive" in body && typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    await prisma.room.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/rooms/[id] error:", err);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}
