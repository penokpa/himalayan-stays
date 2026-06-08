import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildBookingIcs } from "@/lib/booking-ics";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;

  const booking = await prisma.booking.findUnique({
    where: { bookingRef: ref },
    include: {
      bookedBy: { select: { name: true } },
      itinerary: { select: { name: true } },
      legs: {
        orderBy: { checkInDate: "asc" },
        include: {
          lodge: { select: { name: true, village: true, altitudeMeters: true } },
          room: { select: { name: true } },
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  const ics = buildBookingIcs({
    bookingRef: booking.bookingRef,
    itineraryName: booking.itinerary?.name ?? null,
    guestName: booking.bookedBy.name,
    groupSize: booking.groupSize,
    appUrl,
    legs: booking.legs.map((l) => ({
      lodgeName: l.lodge.name,
      lodgeVillage: l.lodge.village,
      altitudeMeters: l.lodge.altitudeMeters,
      roomName: l.room.name,
      nightCount: l.nightCount,
      checkInDate: l.checkInDate,
      checkOutDate: l.checkOutDate,
    })),
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="booking-${booking.bookingRef}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
