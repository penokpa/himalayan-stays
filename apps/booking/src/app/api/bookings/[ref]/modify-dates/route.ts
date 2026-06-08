import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quoteRoom } from "@/lib/pricing";
import { nprToUsd } from "@/lib/currency";
import { logBookingEvent } from "@/lib/audit";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    const newStartDate = body.startDate as string | undefined;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required to verify ownership of the booking." },
        { status: 400 }
      );
    }
    if (!newStartDate) {
      return NextResponse.json(
        { error: "startDate is required" },
        { status: 400 }
      );
    }
    // Parse "YYYY-MM-DD" strictly as UTC midnight to match @db.Date storage
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(newStartDate);
    if (!isoMatch) {
      return NextResponse.json(
        { error: "startDate must be YYYY-MM-DD" },
        { status: 400 }
      );
    }
    const newStart = new Date(
      Date.UTC(
        Number(isoMatch[1]),
        Number(isoMatch[2]) - 1,
        Number(isoMatch[3])
      )
    );

    if (newStart.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "New start date must be in the future." },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { bookingRef: ref },
      include: {
        bookedBy: { select: { email: true } },
        legs: { orderBy: { checkInDate: "asc" } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if ((booking.bookedBy.email ?? "").toLowerCase() !== email) {
      return NextResponse.json(
        { error: "Email doesn't match this booking." },
        { status: 403 }
      );
    }
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          error: `Booking is ${booking.status.toLowerCase().replace("_", " ")} and can't be modified online. Contact support.`,
        },
        { status: 400 }
      );
    }
    if (booking.legs.length === 0) {
      return NextResponse.json(
        { error: "No legs found on this booking" },
        { status: 400 }
      );
    }

    const oldStart = new Date(booking.legs[0].checkInDate);
    if (oldStart.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Original check-in date has already passed. Contact support." },
        { status: 400 }
      );
    }

    const deltaDays = Math.round((newStart.getTime() - oldStart.getTime()) / MS_PER_DAY);
    if (deltaDays === 0) {
      return NextResponse.json(
        { error: "New start date is the same as the current one." },
        { status: 400 }
      );
    }

    // Compute new dates per leg (shift by delta) + check availability + re-quote
    type LegPlan = {
      legId: string;
      roomId: string;
      newCheckIn: Date;
      newCheckOut: Date;
      nights: number;
      newTotal: number;
    };
    const plans: LegPlan[] = [];
    for (const leg of booking.legs) {
      const newIn = new Date(leg.checkInDate.getTime() + deltaDays * MS_PER_DAY);
      const newOut = new Date(leg.checkOutDate.getTime() + deltaDays * MS_PER_DAY);

      // Availability — find any other booking leg that overlaps
      const conflict = await prisma.bookingLeg.findFirst({
        where: {
          roomId: leg.roomId,
          id: { not: leg.id },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          checkInDate: { lt: newOut },
          checkOutDate: { gt: newIn },
        },
        include: { booking: { select: { status: true, createdAt: true } } },
      });
      // Mirror the stale-PENDING rule from booking creation: PENDING bookings
      // older than 30 minutes don't block.
      const blocking =
        conflict &&
        !(
          conflict.booking.status === "PENDING" &&
          Date.now() - conflict.booking.createdAt.getTime() > 30 * 60 * 1000
        );
      if (blocking) {
        return NextResponse.json(
          {
            error: `Room not available for the new dates (${newIn.toISOString().slice(0, 10)} → ${newOut.toISOString().slice(0, 10)}).`,
          },
          { status: 409 }
        );
      }

      const quote = await quoteRoom(leg.roomId, newIn, newOut);
      plans.push({
        legId: leg.id,
        roomId: leg.roomId,
        newCheckIn: newIn,
        newCheckOut: newOut,
        nights: leg.nightCount,
        newTotal: quote.totalNpr,
      });
    }

    const newTotalNpr = plans.reduce((sum, p) => sum + p.newTotal, 0);
    const oldTotalNpr = Number(booking.totalPriceNpr ?? 0);

    await prisma.$transaction(async (tx) => {
      for (const plan of plans) {
        await tx.bookingLeg.update({
          where: { id: plan.legId },
          data: {
            checkInDate: plan.newCheckIn,
            checkOutDate: plan.newCheckOut,
            legTotal: plan.newTotal,
            pricePerNight: plan.newTotal / plan.nights,
          },
        });
      }
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          totalPriceNpr: newTotalNpr,
          totalPriceUsd: nprToUsd(newTotalNpr),
        },
      });

      await logBookingEvent({
        bookingId: booking.id,
        type: "dates_modified",
        actor: { email, role: "TREKKER" },
        metadata: {
          shiftedDays: deltaDays,
          oldStart: oldStart.toISOString().slice(0, 10),
          newStart: newStart.toISOString().slice(0, 10),
          oldTotalNpr,
          newTotalNpr,
          diffNpr: newTotalNpr - oldTotalNpr,
        },
        tx,
      });
    });

    return NextResponse.json({
      ok: true,
      oldTotalNpr,
      newTotalNpr,
      diffNpr: newTotalNpr - oldTotalNpr,
      shiftedDays: deltaDays,
    });
  } catch (error) {
    console.error("POST /api/bookings/[ref]/modify-dates error:", error);
    return NextResponse.json(
      { error: "Failed to modify booking dates" },
      { status: 500 }
    );
  }
}
