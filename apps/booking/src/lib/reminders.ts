import { prisma } from "@/lib/prisma";
import { sendBookingReminderEmail } from "@/lib/email";
import { logBookingEvent } from "@/lib/audit";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const REMINDER_DAYS_AHEAD = 7;
const REMINDER_WINDOW_HOURS = 24; // catch bookings between 7d and 6d before check-in

export interface ReminderResult {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{
    bookingRef: string;
    email: string;
    status: "sent" | "skipped" | "failed";
    reason?: string;
  }>;
}

export async function processReminders(): Promise<ReminderResult> {
  // Window: bookings whose first check-in is between [now + 6.5d, now + 7.5d]
  // — runs daily and catches each booking exactly once.
  const now = Date.now();
  const lower = new Date(now + (REMINDER_DAYS_AHEAD - 0.5) * MS_PER_DAY);
  const upper = new Date(now + (REMINDER_DAYS_AHEAD + 0.5) * MS_PER_DAY);

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
      legs: {
        some: {
          checkInDate: { gte: lower, lt: upper },
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
        },
      },
    },
    include: {
      bookedBy: { select: { name: true, email: true } },
      itinerary: { select: { name: true } },
      legs: {
        orderBy: { checkInDate: "asc" },
        include: {
          lodge: { select: { name: true, village: true } },
        },
      },
      events: {
        where: { type: "reminder_sent" },
        select: { id: true },
      },
    },
  });

  const result: ReminderResult = {
    scanned: bookings.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const b of bookings) {
    const ref = b.bookingRef;
    const email = b.bookedBy.email ?? "";

    if (!email) {
      result.skipped++;
      result.details.push({ bookingRef: ref, email, status: "skipped", reason: "no email on file" });
      continue;
    }
    if (b.events.length > 0) {
      result.skipped++;
      result.details.push({ bookingRef: ref, email, status: "skipped", reason: "already sent" });
      continue;
    }

    const firstLeg = b.legs[0];
    const daysUntil = Math.round(
      (firstLeg.checkInDate.getTime() - now) / MS_PER_DAY
    );

    const send = await sendBookingReminderEmail({
      bookingRef: ref,
      guestName: b.bookedBy.name,
      guestEmail: email,
      daysUntilCheckIn: daysUntil,
      firstCheckIn: firstLeg.checkInDate,
      itineraryName: b.itinerary?.name,
      totalAmount: Number(b.totalPriceNpr ?? 0),
      legs: b.legs.map((l) => ({
        lodgeName: l.lodge.name,
        lodgeVillage: l.lodge.village,
        roomName: "",
        checkInDate: l.checkInDate,
        checkOutDate: l.checkOutDate,
        nightCount: l.nightCount,
        legTotal: Number(l.legTotal),
      })),
    });

    if (send.ok) {
      await logBookingEvent({
        bookingId: b.id,
        type: "reminder_sent",
        actor: { role: "SYSTEM" },
        metadata: { daysUntil, providerId: send.id ?? null },
      });
      result.sent++;
      result.details.push({ bookingRef: ref, email, status: "sent" });
    } else {
      result.failed++;
      result.details.push({ bookingRef: ref, email, status: "failed", reason: send.error });
    }
  }

  return result;
}
