import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logBookingEvent } from "@/lib/audit";
import { refundBooking } from "@/lib/refunds";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Email is required to verify ownership of the booking." },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { bookingRef: ref },
      include: {
        bookedBy: { select: { id: true, email: true } },
        legs: {
          orderBy: { checkInDate: "asc" },
          select: { id: true, checkInDate: true },
        },
        payments: {
          select: { id: true, method: true, status: true, amount: true },
        },
        refunds: { select: { amount: true, status: true } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if ((booking.bookedBy.email ?? "").toLowerCase() !== email) {
      return NextResponse.json(
        { error: "Email doesn't match this booking. Cancellation not authorized." },
        { status: 403 }
      );
    }

    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          error: `Booking is ${booking.status.toLowerCase().replace("_", " ")} and can no longer be cancelled online. Contact support if needed.`,
        },
        { status: 400 }
      );
    }

    const earliestCheckIn = booking.legs[0]?.checkInDate;
    if (earliestCheckIn && earliestCheckIn.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error: "Check-in date has already passed. Contact support to cancel.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" },
      });
      await tx.bookingLeg.updateMany({
        where: { bookingId: booking.id },
        data: { status: "CANCELLED" },
      });
      await tx.payment.updateMany({
        where: {
          bookingId: booking.id,
          method: "CASH",
          status: "INITIATED",
        },
        data: { status: "FAILED" },
      });

      await logBookingEvent({
        bookingId: booking.id,
        type: "cancelled",
        actor: { email, role: "TREKKER" },
        metadata: { previousStatus: booking.status },
        tx,
      });
    });

    // Auto-issue refund if there's a completed payment with remaining balance
    const completedPayment = booking.payments.find((p) => p.status === "COMPLETED");
    let refundResult: { ok: boolean; message?: string; error?: string } = { ok: false };
    if (completedPayment) {
      const alreadyRefunded = booking.refunds
        .filter((r) => r.status === "COMPLETED" || r.status === "MANUAL_PENDING" || r.status === "INITIATED")
        .reduce((s, r) => s + Number(r.amount), 0);
      const remaining = Number(completedPayment.amount) - alreadyRefunded;
      if (remaining > 0.01) {
        try {
          const r = await refundBooking({
            bookingRef: ref,
            amountNpr: remaining,
            reason: "Auto-refund on booking cancellation",
            initiatedById: booking.bookedBy.id,
            initiatedByEmail: email,
          });
          refundResult = { ok: true, message: r.message };
        } catch (err) {
          console.error("[cancel] auto-refund failed:", err);
          refundResult = {
            ok: false,
            error: err instanceof Error ? err.message : "Auto-refund failed",
          };
        }
      }
    }

    return NextResponse.json({ ok: true, refund: refundResult });
  } catch (error) {
    console.error("POST /api/bookings/[ref]/cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
