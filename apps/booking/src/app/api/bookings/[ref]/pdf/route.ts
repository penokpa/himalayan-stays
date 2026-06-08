import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderBookingPdf, type BookingPdfData } from "@/lib/booking-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;

  const booking = await prisma.booking.findUnique({
    where: { bookingRef: ref },
    include: {
      bookedBy: { select: { name: true, email: true } },
      itinerary: { select: { name: true } },
      legs: {
        orderBy: [{ dayNumber: "asc" }, { checkInDate: "asc" }],
        include: {
          lodge: { select: { name: true, village: true, altitudeMeters: true } },
          room: { select: { name: true } },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          method: true,
          status: true,
          amount: true,
          currency: true,
          paidAt: true,
          providerTxnId: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const data: BookingPdfData = {
    bookingRef: booking.bookingRef,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    itineraryName: booking.itinerary?.name ?? null,
    guestName: booking.bookedBy.name,
    guestEmail: booking.bookedBy.email ?? "",
    groupSize: booking.groupSize,
    specialRequests: booking.specialRequests,
    totalNpr: Number(booking.totalPriceNpr ?? 0),
    totalUsd: booking.totalPriceUsd ? Number(booking.totalPriceUsd) : null,
    createdAt: booking.createdAt,
    legs: booking.legs.map((l) => ({
      lodgeName: l.lodge.name,
      lodgeVillage: l.lodge.village,
      altitudeMeters: l.lodge.altitudeMeters,
      roomName: l.room.name,
      checkIn: l.checkInDate,
      checkOut: l.checkOutDate,
      nights: l.nightCount,
      legTotal: Number(l.legTotal),
      dayNumber: l.dayNumber,
    })),
    payments: booking.payments.map((p) => ({
      method: p.method,
      status: p.status,
      amount: Number(p.amount),
      currency: p.currency,
      paidAt: p.paidAt,
      providerTxnId: p.providerTxnId,
    })),
  };

  try {
    const pdfBuffer = await renderBookingPdf(data);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="booking-${booking.bookingRef}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("PDF render error:", error);
    return NextResponse.json({ error: "Failed to render PDF" }, { status: 500 });
  }
}
