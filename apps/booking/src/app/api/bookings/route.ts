import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateBookingRef } from "@/lib/booking-utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lodgeId,
      roomId,
      checkInDate,
      checkOutDate,
      guestName,
      guestEmail,
      groupSize,
      specialRequests,
    } = body;

    // Validate required fields
    if (!lodgeId || !roomId || !checkInDate || !checkOutDate || !guestName || !guestEmail) {
      return NextResponse.json(
        { error: "Missing required fields: lodgeId, roomId, checkInDate, checkOutDate, guestName, guestEmail" },
        { status: 400 }
      );
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (checkOut <= checkIn) {
      return NextResponse.json(
        { error: "checkOutDate must be after checkInDate" },
        { status: 400 }
      );
    }

    // Check room exists and belongs to lodge
    const room = await prisma.room.findFirst({
      where: { id: roomId, lodgeId, isActive: true },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found or inactive" },
        { status: 404 }
      );
    }

    // Check availability — no overlapping active booking legs
    const overlap = await prisma.bookingLeg.findFirst({
      where: {
        roomId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
      },
    });

    if (overlap) {
      return NextResponse.json(
        { error: "Room is not available for the selected dates" },
        { status: 409 }
      );
    }

    // Calculate nights and total
    const nightCount = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    const pricePerNight = room.basePriceNpr;
    const legTotal = pricePerNight.toNumber() * nightCount;

    const bookingRef = generateBookingRef();

    // Find or create user by email
    const user = await prisma.user.upsert({
      where: { email: guestEmail },
      update: {},
      create: {
        email: guestEmail,
        name: guestName,
        role: "TREKKER",
      },
    });

    // Create booking + booking leg in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingRef,
          bookedById: user.id,
          bookingType: "INDIVIDUAL",
          status: "PENDING",
          groupSize: groupSize ?? 1,
          specialRequests: specialRequests ?? null,
          totalPriceNpr: legTotal,
        },
      });

      await tx.bookingLeg.create({
        data: {
          bookingId: newBooking.id,
          lodgeId,
          roomId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          nightCount,
          pricePerNight,
          legTotal,
          status: "PENDING",
        },
      });

      return newBooking;
    });

    return NextResponse.json(
      { booking: { ...booking, bookingRef } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
