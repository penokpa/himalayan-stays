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
