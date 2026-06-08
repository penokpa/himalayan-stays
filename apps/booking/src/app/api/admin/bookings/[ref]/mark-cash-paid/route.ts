import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logBookingEvent } from "@/lib/audit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ref } = await params;
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingRef: ref },
      include: {
        payments: { where: { method: "CASH", status: "INITIATED" } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.payments.length === 0) {
      return NextResponse.json(
        { error: "No pending cash payment to mark as collected" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: {
          bookingId: booking.id,
          method: "CASH",
          status: "INITIATED",
        },
        data: { status: "COMPLETED", paidAt: new Date() },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: "COMPLETED" },
      });

      await logBookingEvent({
        bookingId: booking.id,
        type: "cash_collected",
        actor: {
          id: session.user.id,
          email: session.user.email,
          role: "ADMIN",
        },
        metadata: { amountNpr: Number(booking.totalPriceNpr ?? 0) },
        tx,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/bookings/[ref]/mark-cash-paid error:", error);
    return NextResponse.json(
      { error: "Failed to mark cash as collected" },
      { status: 500 }
    );
  }
}
