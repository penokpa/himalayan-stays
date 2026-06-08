import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateBookingRef, activeOverlapWhere } from "@/lib/booking-utils";
import { nprToUsd } from "@/lib/currency";
import { quoteRoom } from "@/lib/pricing";
import { logBookingEvent } from "@/lib/audit";
import { evaluatePromo, consumePromo } from "@/lib/promo";

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
      promoCode,
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
    // (stale PENDING bookings older than 30 min no longer block)
    const overlap = await prisma.bookingLeg.findFirst({
      where: activeOverlapWhere(roomId, checkIn, checkOut),
    });

    if (overlap) {
      return NextResponse.json(
        { error: "Room is not available for the selected dates" },
        { status: 409 }
      );
    }

    // Calculate nights and season-aware total
    const nightCount = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );
    const quote = await quoteRoom(roomId, checkIn, checkOut);
    const legTotal = quote.totalNpr;
    const pricePerNight = legTotal / nightCount;

    // Validate promo if supplied
    let promoApplied: { id: string; code: string; discountNpr: number } | null = null;
    let totalAfterDiscount = legTotal;
    if (promoCode) {
      const result = await evaluatePromo(String(promoCode), legTotal);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      promoApplied = {
        id: result.code.id,
        code: result.code.code,
        discountNpr: result.discountNpr,
      };
      totalAfterDiscount = result.finalNpr;
    }

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
      // Reserve the promo consumption inside the transaction (race-safe)
      if (promoApplied) {
        const ok = await consumePromo(promoApplied.id, tx);
        if (!ok) throw new Error("Promo code reached its usage limit");
      }
      const newBooking = await tx.booking.create({
        data: {
          bookingRef,
          bookedById: user.id,
          bookingType: "INDIVIDUAL",
          status: "PENDING",
          groupSize: groupSize ?? 1,
          specialRequests: specialRequests ?? null,
          totalPriceNpr: totalAfterDiscount,
          totalPriceUsd: nprToUsd(totalAfterDiscount),
          promoCodeId: promoApplied?.id ?? null,
          discountNpr: promoApplied?.discountNpr ?? null,
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

      await logBookingEvent({
        bookingId: newBooking.id,
        type: "booking_created",
        actor: { email: guestEmail, role: "TREKKER" },
        metadata: {
          lodgeId,
          roomId,
          checkIn: checkIn.toISOString().slice(0, 10),
          checkOut: checkOut.toISOString().slice(0, 10),
          grossNpr: legTotal,
          discountNpr: promoApplied?.discountNpr ?? 0,
          totalNpr: totalAfterDiscount,
          promoCode: promoApplied?.code ?? null,
          source: "single_lodge",
        },
        tx,
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
