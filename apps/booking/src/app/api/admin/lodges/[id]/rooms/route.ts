import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLodgeAccess } from "@/lib/lodge-access";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: lodgeId } = await params;
  const access = await checkLodgeAccess(lodgeId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {

    const body = await request.json();
    const { name, roomType, capacity, basePriceNpr, floor } = body;

    if (!name || !roomType || !capacity || basePriceNpr == null) {
      return NextResponse.json(
        { error: "Missing required fields: name, roomType, capacity, basePriceNpr" },
        { status: 400 },
      );
    }

    const validRoomTypes = ["PRIVATE_SINGLE", "PRIVATE_DOUBLE", "PRIVATE_TWIN", "DORM"];
    if (!validRoomTypes.includes(roomType)) {
      return NextResponse.json(
        { error: `Invalid roomType. Must be one of: ${validRoomTypes.join(", ")}` },
        { status: 400 },
      );
    }

    const room = await prisma.room.create({
      data: {
        lodgeId,
        name,
        roomType,
        capacity: Number(capacity),
        basePriceNpr: Number(basePriceNpr),
        floor: floor != null ? Number(floor) : null,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/lodges/[id]/rooms error:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 },
    );
  }
}
