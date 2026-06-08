import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  generateBookingRef,
  calculateCheckInDate,
  calculateCheckOutDate,
  activeOverlapWhere,
} from "@/lib/booking-utils";
import { TrekRoute } from "@prisma/client";
import { nprToUsd } from "@/lib/currency";
import { quoteRoom } from "@/lib/pricing";
import { logBookingEvent } from "@/lib/audit";

interface StopInput {
  lodgeId: string;
  roomId: string;
  dayNumber: number;
  nights: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      trekRoute,
      itineraryName,
      startDate,
      groupSize,
      guestName,
      guestEmail,
      specialRequests,
      stops,
    } = body as {
      trekRoute: string;
      itineraryName: string;
      startDate: string;
      groupSize: number;
      guestName: string;
      guestEmail: string;
      specialRequests?: string;
      stops: StopInput[];
    };

    if (
      !trekRoute ||
      !itineraryName ||
      !startDate ||
      !guestName ||
      !guestEmail ||
      !stops?.length
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Object.values(TrekRoute).includes(trekRoute as TrekRoute)) {
      return NextResponse.json(
        { error: "Invalid trek route" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid start date" },
        { status: 400 }
      );
    }

    // Validate all rooms exist and belong to correct lodges
    const roomIds = stops.map((s) => s.roomId);
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds }, isActive: true },
    });
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    for (const stop of stops) {
      const room = roomMap.get(stop.roomId);
      if (!room) {
        return NextResponse.json(
          { error: `Room ${stop.roomId} not found or inactive` },
          { status: 404 }
        );
      }
      if (room.lodgeId !== stop.lodgeId) {
        return NextResponse.json(
          { error: `Room ${stop.roomId} does not belong to lodge ${stop.lodgeId}` },
          { status: 400 }
        );
      }
    }

    // Check availability for all stops
    const unavailableStops: number[] = [];
    for (const stop of stops) {
      const checkIn = calculateCheckInDate(start, stop.dayNumber);
      const checkOut = calculateCheckOutDate(checkIn, stop.nights);

      const overlap = await prisma.bookingLeg.findFirst({
        where: activeOverlapWhere(stop.roomId, checkIn, checkOut),
      });

      if (overlap) {
        unavailableStops.push(stop.dayNumber);
      }
    }

    if (unavailableStops.length > 0) {
      return NextResponse.json(
        {
          error: "Some rooms are no longer available",
          unavailableStops,
        },
        { status: 409 }
      );
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: guestEmail },
      update: {},
      create: {
        email: guestEmail,
        name: guestName,
        role: "TREKKER",
      },
    });

    const bookingRef = generateBookingRef();

    // Calculate total days from stops
    const lastStop = stops[stops.length - 1];
    const totalDays = lastStop.dayNumber + lastStop.nights - 1;

    // Quote all rooms BEFORE the transaction — quoting is read-only and the
    // extra Prisma round-trips would otherwise exceed the default tx timeout.
    let totalPriceNpr = 0;
    const legData = await Promise.all(
      stops.map(async (stop) => {
        const checkIn = calculateCheckInDate(start, stop.dayNumber);
        const checkOut = calculateCheckOutDate(checkIn, stop.nights);
        const quote = await quoteRoom(stop.roomId, checkIn, checkOut);
        const legTotal = quote.totalNpr;
        totalPriceNpr += legTotal;
        return {
          lodgeId: stop.lodgeId,
          roomId: stop.roomId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          nightCount: stop.nights,
          pricePerNight: legTotal / stop.nights,
          legTotal,
          status: "PENDING" as const,
          dayNumber: stop.dayNumber,
        };
      })
    );

    // Create everything in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Create itinerary
      const itinerary = await tx.itinerary.create({
        data: {
          name: itineraryName,
          trekRoute: trekRoute as TrekRoute,
          totalDays,
          createdById: user.id,
          isTemplate: false,
        },
      });

      // Create itinerary stops
      await tx.itineraryStop.createMany({
        data: stops.map((stop) => ({
          itineraryId: itinerary.id,
          lodgeId: stop.lodgeId,
          dayNumber: stop.dayNumber,
          nights: stop.nights,
        })),
      });

      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          bookingRef,
          itineraryId: itinerary.id,
          bookedById: user.id,
          bookingType: "INDIVIDUAL",
          status: "PENDING",
          groupSize: groupSize ?? 1,
          specialRequests: specialRequests ?? null,
          totalPriceNpr,
          totalPriceUsd: nprToUsd(totalPriceNpr),
        },
      });

      // Create booking legs
      for (const leg of legData) {
        await tx.bookingLeg.create({
          data: {
            bookingId: newBooking.id,
            ...leg,
          },
        });
      }

      await logBookingEvent({
        bookingId: newBooking.id,
        type: "booking_created",
        actor: { email: guestEmail, role: "TREKKER" },
        metadata: {
          trekRoute,
          itineraryName,
          stops: stops.length,
          totalNpr: totalPriceNpr,
          source: "itinerary",
        },
        tx,
      });

      return newBooking;
    }, { timeout: 15000 });

    return NextResponse.json(
      { booking: { ...booking, bookingRef } },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/bookings/itinerary error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
