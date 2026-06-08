import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { BookingStatus } from "@prisma/client";
import { logBookingEvent } from "@/lib/audit";
import { refundBooking } from "@/lib/refunds";

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ref } = await params;
  try {
    const body = await request.json();
    const nextStatus = body.status as BookingStatus;

    const booking = await prisma.booking.findUnique({
      where: { bookingRef: ref },
      select: { id: true, status: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition ${booking.status} → ${nextStatus}. Allowed: ${
            allowed.length ? allowed.join(", ") : "(none — terminal)"
          }`,
        },
        { status: 400 }
      );
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: nextStatus },
    });

    // Propagate status to all legs so per-lodge owner views stay in sync.
    // CHECKED_IN is intentionally NOT propagated — for multi-lodge bookings,
    // each lodge handles its own check-in via the PMS.
    if (nextStatus === "CONFIRMED" || nextStatus === "COMPLETED" || nextStatus === "NO_SHOW") {
      await prisma.bookingLeg.updateMany({
        where: { bookingId: booking.id },
        data: { status: nextStatus },
      });
    }

    await logBookingEvent({
      bookingId: booking.id,
      type: "status_changed",
      actor: {
        id: session.user.id,
        email: session.user.email,
        role: "ADMIN",
      },
      metadata: { from: booking.status, to: nextStatus },
    });

    // Auto-refund on admin cancellation if there's a completed payment with remaining balance
    let refundResult: { ok: boolean; message?: string; error?: string } | null = null;
    if (nextStatus === "CANCELLED") {
      const full = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: {
          payments: { select: { method: true, status: true, amount: true } },
          refunds: { select: { amount: true, status: true } },
        },
      });
      const completed = full?.payments.find((p) => p.status === "COMPLETED");
      if (completed) {
        const already = (full?.refunds ?? [])
          .filter((r) => r.status === "COMPLETED" || r.status === "MANUAL_PENDING" || r.status === "INITIATED")
          .reduce((s, r) => s + Number(r.amount), 0);
        const remaining = Number(completed.amount) - already;
        if (remaining > 0.01) {
          try {
            const r = await refundBooking({
              bookingRef: ref,
              amountNpr: remaining,
              reason: "Auto-refund on admin cancellation",
              initiatedById: session.user.id,
              initiatedByEmail: session.user.email ?? undefined,
            });
            refundResult = { ok: true, message: r.message };
          } catch (err) {
            console.error("[admin cancel] auto-refund failed:", err);
            refundResult = {
              ok: false,
              error: err instanceof Error ? err.message : "Auto-refund failed",
            };
          }
        }
      }
      // Also void any pending cash hold
      await prisma.payment.updateMany({
        where: { bookingId: booking.id, method: "CASH", status: "INITIATED" },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ ok: true, status: nextStatus, refund: refundResult });
  } catch (error) {
    console.error("PATCH /api/admin/bookings/[ref]/status error:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
