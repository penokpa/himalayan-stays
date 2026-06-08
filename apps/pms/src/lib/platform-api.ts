/// <reference types="vite/client" />

const PLATFORM_BASE_URL =
  (import.meta.env.VITE_BOOKING_API_URL as string | undefined) ||
  "http://localhost:3000";

export interface PlatformLeg {
  lodgeName: string;
  lodgeVillage: string;
  lodgeSlug: string;
  roomName: string;
  roomType: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string;
  nightCount: number;
  status: string;
}

export interface PlatformBookingLookup {
  bookingRef: string;
  status: string;
  guestName: string;
  nationality: string | null;
  groupSize: number;
  specialRequests: string | null;
  paid: boolean;
  paymentMethod: string | null;
  cashOnArrival: boolean;
  legs: PlatformLeg[];
}

export class PlatformApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Look up a booking by its ref against the platform API.
 * Returns the sanitized public booking, or null if not found.
 * Throws on network or non-404 errors.
 */
export async function lookupBooking(
  ref: string
): Promise<PlatformBookingLookup | null> {
  const cleanRef = ref.trim().toUpperCase();
  if (!cleanRef) throw new PlatformApiError("Empty booking ref", 400);

  let res: Response;
  try {
    res = await fetch(
      `${PLATFORM_BASE_URL}/api/bookings/${encodeURIComponent(cleanRef)}/lookup`,
      { headers: { Accept: "application/json" } }
    );
  } catch (err) {
    throw new PlatformApiError(
      err instanceof Error ? err.message : "Network error",
      0
    );
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new PlatformApiError(`Platform error (${res.status})`, res.status);
  }
  return (await res.json()) as PlatformBookingLookup;
}
