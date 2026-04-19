import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lodgeId = searchParams.get("lodgeId");
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");

    if (!lodgeId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: "lodgeId, checkIn, and checkOut are required" },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: "checkOut must be after checkIn" },
        { status: 400 }
      );
    }

    // Get all active rooms for the lodge
    const rooms = await prisma.room.findMany({
      where: { lodgeId, isActive: true },
      orderBy: { name: "asc" },
    });

    // Find rooms that have overlapping booking legs (not cancelled/no-show)
    const overlappingLegs = await prisma.bookingLeg.findMany({
      where: {
        lodgeId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
      select: { roomId: true },
    });

    const bookedRoomIds = new Set(overlappingLegs.map((leg) => leg.roomId));

    const result = rooms.map((room) => ({
      ...room,
      isAvailable: !bookedRoomIds.has(room.id),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/rooms/availability error:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
