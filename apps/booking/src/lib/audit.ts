import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type BookingEventType =
  | "booking_created"
  | "status_changed"
  | "payment_initiated"
  | "payment_completed"
  | "payment_failed"
  | "cash_held"
  | "cash_collected"
  | "dates_modified"
  | "cancelled"
  | "reminder_sent"
  | "refund_created";

export interface AuditActor {
  id?: string | null;
  email?: string | null;
  role?: string | null;
}

/**
 * Append a BookingEvent. Never throws — audit failures must not break user-facing flows.
 * If you have a tx in scope, pass it via `tx` to make the write part of the parent transaction.
 */
export async function logBookingEvent(args: {
  bookingId: string;
  type: BookingEventType;
  actor?: AuditActor;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const client = args.tx ?? prisma;
  try {
    await client.bookingEvent.create({
      data: {
        bookingId: args.bookingId,
        type: args.type,
        actorId: args.actor?.id ?? null,
        actorEmail: args.actor?.email ?? null,
        actorRole: args.actor?.role ?? null,
        metadata: args.metadata,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to log booking event:", err);
  }
}
