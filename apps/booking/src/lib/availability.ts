import { prisma } from "@/lib/prisma";
import { PENDING_HOLD_MINUTES } from "@/lib/booking-utils";

export type RoomAvailability = "available" | "booked";

/**
 * Returns a Map<roomId, "available" | "booked"> for the given lodge over [from, to).
 * Stale PENDING bookings (>30 min) don't block (matches booking creation rules).
 */
export async function getRoomAvailability(
  lodgeId: string,
  from: Date,
  to: Date
): Promise<Map<string, RoomAvailability>> {
  const rooms = await prisma.room.findMany({
    where: { lodgeId, isActive: true },
    select: { id: true },
  });
  if (rooms.length === 0) return new Map();
  const roomIds = rooms.map((r) => r.id);

  const staleCutoff = new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000);

  const conflicts = await prisma.bookingLeg.findMany({
    where: {
      roomId: { in: roomIds },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      checkInDate: { lt: to },
      checkOutDate: { gt: from },
      booking: {
        OR: [
          { status: { not: "PENDING" } },
          { status: "PENDING", createdAt: { gte: staleCutoff } },
        ],
      },
    },
    select: { roomId: true },
  });
  const bookedSet = new Set(conflicts.map((c) => c.roomId));

  const map = new Map<string, RoomAvailability>();
  for (const r of rooms) {
    map.set(r.id, bookedSet.has(r.id) ? "booked" : "available");
  }
  return map;
}

export interface DayAvailability {
  iso: string;            // YYYY-MM-DD
  totalRooms: number;
  bookedRooms: number;    // count of distinct rooms with overlapping booking that night
  status: "available" | "partial" | "full";
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Per-day availability for a whole month (or any window). Day N covers the night
 * starting on iso N — i.e. a leg with checkInDate=N1, checkOutDate=N3 occupies nights N1, N2.
 */
export async function getMonthAvailability(
  lodgeId: string,
  year: number,
  monthIndex: number, // 0-11
): Promise<DayAvailability[]> {
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1));
  const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / MS_PER_DAY);

  const rooms = await prisma.room.findMany({
    where: { lodgeId, isActive: true },
    select: { id: true },
  });
  const totalRooms = rooms.length;
  if (totalRooms === 0) {
    return Array.from({ length: daysInMonth }).map((_, i) => {
      const d = new Date(Date.UTC(year, monthIndex, i + 1));
      return { iso: isoDateUTC(d), totalRooms: 0, bookedRooms: 0, status: "full" as const };
    });
  }

  const staleCutoff = new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000);

  const legs = await prisma.bookingLeg.findMany({
    where: {
      lodgeId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      checkInDate: { lt: monthEnd },
      checkOutDate: { gt: monthStart },
      booking: {
        OR: [
          { status: { not: "PENDING" } },
          { status: "PENDING", createdAt: { gte: staleCutoff } },
        ],
      },
    },
    select: { roomId: true, checkInDate: true, checkOutDate: true },
  });

  // For each day, count distinct rooms with an overlapping leg.
  const days: DayAvailability[] = [];
  for (let i = 0; i < daysInMonth; i++) {
    const dayStart = new Date(Date.UTC(year, monthIndex, i + 1));
    const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY);
    const occupied = new Set<string>();
    for (const l of legs) {
      if (l.checkInDate < dayEnd && l.checkOutDate > dayStart) {
        occupied.add(l.roomId);
      }
    }
    const bookedRooms = occupied.size;
    const status: DayAvailability["status"] =
      bookedRooms === 0
        ? "available"
        : bookedRooms >= totalRooms
        ? "full"
        : "partial";
    days.push({ iso: isoDateUTC(dayStart), totalRooms, bookedRooms, status });
  }
  return days;
}

/** Count of CONFIRMED/CHECKED_IN/COMPLETED bookings touching this lodge in the last N days. */
export async function getRecentBookingCount(
  lodgeId: string,
  days: number = 30
): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.bookingLeg.count({
    where: {
      lodgeId,
      booking: {
        status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
        createdAt: { gte: since },
      },
    },
  });
}
