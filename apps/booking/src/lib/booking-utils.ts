export const ROOM_TYPE_LABELS: Record<string, string> = {
  PRIVATE_SINGLE: "Private Single",
  PRIVATE_DOUBLE: "Private Double",
  PRIVATE_TWIN: "Private Twin",
  DORM: "Dormitory",
};

export function generateBookingRef(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HS-${datePart}-${random}`;
}

export function calculateCheckInDate(startDate: Date, dayNumber: number): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}

export function calculateCheckOutDate(checkInDate: Date, nights: number): Date {
  const date = new Date(checkInDate);
  date.setDate(date.getDate() + nights);
  return date;
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Bookings that have been PENDING longer than this without payment selection
// no longer block availability — the user abandoned the form.
export const PENDING_HOLD_MINUTES = 30;

// Builds a Prisma `where` filter for bookingLeg overlap that excludes:
//  - cancelled / no-show legs
//  - legs whose parent booking is PENDING and older than PENDING_HOLD_MINUTES
export function activeOverlapWhere(roomId: string, checkIn: Date, checkOut: Date) {
  const staleCutoff = new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000);
  return {
    roomId,
    status: { notIn: ["CANCELLED" as const, "NO_SHOW" as const] },
    checkInDate: { lt: checkOut },
    checkOutDate: { gt: checkIn },
    booking: {
      OR: [
        { status: { not: "PENDING" as const } },
        { status: "PENDING" as const, createdAt: { gte: staleCutoff } },
      ],
    },
  };
}
