import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import {
  sendBookingConfirmationEmail,
  sendOwnerBookingNotificationEmail,
} from "@/lib/email";
import { logBookingEvent } from "@/lib/audit";
import type { PaymentProvider } from "./types";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: "Credit/Debit Card (Stripe)",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "Pay at Lodge",
};

async function notifyOwnersOfBooking(
  bookingRef: string,
  paymentMethodLabel: string,
  willPayAtLodge: boolean
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { bookingRef },
      include: {
        bookedBy: {
          select: { name: true, email: true, phone: true, nationality: true },
        },
        legs: {
          orderBy: { dayNumber: "asc" },
          include: {
            room: { select: { name: true } },
            lodge: {
              select: {
                id: true,
                name: true,
                owner: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });
    if (!booking) return;

    // Group legs by lodge owner email so each owner gets one email per booking
    type Group = {
      to: string;
      ownerName: string;
      lodgeNames: Set<string>;
      legs: {
        roomName: string;
        checkInDate: Date;
        checkOutDate: Date;
        nightCount: number;
        legTotal: number;
      }[];
      total: number;
    };
    const byOwner = new Map<string, Group>();
    for (const leg of booking.legs) {
      const ownerEmail = leg.lodge.owner.email;
      if (!ownerEmail) continue;
      const key = ownerEmail.toLowerCase();
      let g = byOwner.get(key);
      if (!g) {
        g = {
          to: ownerEmail,
          ownerName: leg.lodge.owner.name,
          lodgeNames: new Set(),
          legs: [],
          total: 0,
        };
        byOwner.set(key, g);
      }
      g.lodgeNames.add(leg.lodge.name);
      g.legs.push({
        roomName: `${leg.lodge.name} · ${leg.room.name}`,
        checkInDate: leg.checkInDate,
        checkOutDate: leg.checkOutDate,
        nightCount: leg.nightCount,
        legTotal: Number(leg.legTotal),
      });
      g.total += Number(leg.legTotal);
    }

    await Promise.all(
      Array.from(byOwner.values()).map((g) =>
        sendOwnerBookingNotificationEmail({
          to: g.to,
          ownerName: g.ownerName,
          lodgeName: Array.from(g.lodgeNames).join(", "),
          bookingRef: booking.bookingRef,
          guestName: booking.bookedBy.name,
          guestEmail: booking.bookedBy.email ?? null,
          guestPhone: booking.bookedBy.phone ?? null,
          guestNationality: booking.bookedBy.nationality ?? null,
          groupSize: booking.groupSize,
          paymentMethod: paymentMethodLabel,
          willPayAtLodge,
          legs: g.legs,
          ownerTotalNpr: g.total,
        })
      )
    );
  } catch (err) {
    console.error("[notifyOwnersOfBooking] Failed:", err);
  }
}

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  switch (method) {
    case "STRIPE":
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("./stripe").stripeProvider;
    case "ESEWA":
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("./esewa").esewaProvider;
    case "KHALTI":
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("./khalti").khaltiProvider;
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }
}

export async function completePayment(
  bookingRef: string,
  method: PaymentMethod,
  providerTxnId: string,
  amount: number,
  currency: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Idempotency check — skip if already completed
    const existing = await tx.payment.findFirst({
      where: {
        booking: { bookingRef },
        status: "COMPLETED",
      },
    });
    if (existing) return;

    const booking = await tx.booking.findUnique({
      where: { bookingRef },
    });
    if (!booking) throw new Error(`Booking ${bookingRef} not found`);

    // Void any orphan INITIATED CASH payment (user switched from Pay-at-Lodge to online)
    if (method !== "CASH") {
      await tx.payment.updateMany({
        where: {
          bookingId: booking.id,
          method: "CASH",
          status: "INITIATED",
        },
        data: { status: "FAILED" },
      });
    }

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        method,
        amount,
        currency,
        providerTxnId,
        status: "COMPLETED",
        paidAt: new Date(),
      },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: "COMPLETED",
        status: "CONFIRMED",
        currencyUsed: currency,
      },
    });

    // Confirm all legs so per-lodge owner views match the booking status
    await tx.bookingLeg.updateMany({
      where: { bookingId: booking.id, status: "PENDING" },
      data: { status: "CONFIRMED" },
    });

    await logBookingEvent({
      bookingId: booking.id,
      type: "payment_completed",
      actor: { role: "TREKKER" },
      metadata: { method, amount, currency, providerTxnId },
      tx,
    });
  });

  // Send confirmation email after transaction commits (don't block on failure)
  try {
    const fullBooking = await prisma.booking.findUnique({
      where: { bookingRef },
      include: {
        bookedBy: { select: { name: true, email: true } },
        itinerary: { select: { name: true } },
        legs: {
          orderBy: { dayNumber: "asc" },
          include: {
            lodge: { select: { name: true, village: true } },
            room: { select: { name: true } },
          },
        },
      },
    });

    if (fullBooking?.bookedBy.email) {
      await sendBookingConfirmationEmail({
        bookingRef: fullBooking.bookingRef,
        guestName: fullBooking.bookedBy.name,
        guestEmail: fullBooking.bookedBy.email,
        totalAmount: Number(fullBooking.totalPriceNpr ?? 0),
        currency: "NPR",
        paymentMethod: PAYMENT_METHOD_LABELS[method] ?? method,
        itineraryName: fullBooking.itinerary?.name,
        legs: fullBooking.legs.map((l) => ({
          lodgeName: l.lodge.name,
          lodgeVillage: l.lodge.village,
          roomName: l.room.name,
          checkInDate: l.checkInDate,
          checkOutDate: l.checkOutDate,
          nightCount: l.nightCount,
          legTotal: Number(l.legTotal),
        })),
      });
    }
  } catch (err) {
    console.error("[completePayment] Email send failed:", err);
  }

  await notifyOwnersOfBooking(
    bookingRef,
    PAYMENT_METHOD_LABELS[method] ?? method,
    false
  );
}

export async function confirmPayAtLodge(bookingRef: string): Promise<void> {
  const fullBooking = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { bookingRef } });
    if (!booking) throw new Error(`Booking ${bookingRef} not found`);

    if (booking.status === "CONFIRMED" || booking.paymentStatus === "COMPLETED") {
      return null;
    }

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        method: "CASH",
        amount: Number(booking.totalPriceNpr ?? 0),
        currency: "NPR",
        status: "INITIATED",
      },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", paymentStatus: "INITIATED", currencyUsed: "NPR" },
    });

    // Confirm all legs so per-lodge owner views match the booking status
    await tx.bookingLeg.updateMany({
      where: { bookingId: booking.id, status: "PENDING" },
      data: { status: "CONFIRMED" },
    });

    await logBookingEvent({
      bookingId: booking.id,
      type: "cash_held",
      actor: { role: "TREKKER" },
      metadata: { amountNpr: Number(booking.totalPriceNpr ?? 0) },
      tx,
    });

    return tx.booking.findUnique({
      where: { bookingRef },
      include: {
        bookedBy: { select: { name: true, email: true } },
        itinerary: { select: { name: true } },
        legs: {
          orderBy: { dayNumber: "asc" },
          include: {
            lodge: { select: { name: true, village: true } },
            room: { select: { name: true } },
          },
        },
      },
    });
  });

  if (fullBooking?.bookedBy.email) {
    try {
      await sendBookingConfirmationEmail({
        bookingRef: fullBooking.bookingRef,
        guestName: fullBooking.bookedBy.name,
        guestEmail: fullBooking.bookedBy.email,
        totalAmount: Number(fullBooking.totalPriceNpr ?? 0),
        currency: "NPR",
        paymentMethod: PAYMENT_METHOD_LABELS["CASH"],
        itineraryName: fullBooking.itinerary?.name,
        legs: fullBooking.legs.map((l) => ({
          lodgeName: l.lodge.name,
          lodgeVillage: l.lodge.village,
          roomName: l.room.name,
          checkInDate: l.checkInDate,
          checkOutDate: l.checkOutDate,
          nightCount: l.nightCount,
          legTotal: Number(l.legTotal),
        })),
      });
    } catch (err) {
      console.error("[confirmPayAtLodge] Email send failed:", err);
    }
  }

  await notifyOwnersOfBooking(bookingRef, PAYMENT_METHOD_LABELS["CASH"], true);
}

export type { PaymentProvider, PaymentInitResult, PaymentVerifyResult } from "./types";
