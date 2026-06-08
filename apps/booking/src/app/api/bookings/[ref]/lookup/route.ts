import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;

  const booking = await prisma.booking.findUnique({
    where: { bookingRef: ref },
    include: {
      bookedBy: { select: { name: true, nationality: true } },
      legs: {
        orderBy: { checkInDate: "asc" },
        include: {
          lodge: { select: { name: true, village: true, slug: true } },
          room: { select: { name: true, roomType: true } },
        },
      },
      payments: { select: { status: true, method: true, amount: true, currency: true } },
    },
  });

  if (!booking) {
    return NextResponse.json(
      { error: "Booking not found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Sanitize: never expose email, phone, exact totals, or txn ids over CORS-public endpoint
  const completedPayment = booking.payments.find((p) => p.status === "COMPLETED");
  const cashHold = booking.payments.find(
    (p) => p.method === "CASH" && p.status === "INITIATED"
  );

  const body = {
    bookingRef: booking.bookingRef,
    status: booking.status,
    guestName: booking.bookedBy.name,
    nationality: booking.bookedBy.nationality,
    groupSize: booking.groupSize,
    specialRequests: booking.specialRequests,
    paid: !!completedPayment,
    paymentMethod: completedPayment?.method ?? null,
    cashOnArrival: !!cashHold,
    legs: booking.legs.map((l) => ({
      lodgeName: l.lodge.name,
      lodgeVillage: l.lodge.village,
      lodgeSlug: l.lodge.slug,
      roomName: l.room.name,
      roomType: l.room.roomType,
      checkInDate: l.checkInDate.toISOString().slice(0, 10),
      checkOutDate: l.checkOutDate.toISOString().slice(0, 10),
      nightCount: l.nightCount,
      status: l.status,
    })),
  };

  return NextResponse.json(body, { headers: CORS_HEADERS });
}
