import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";
import { sendBookingConfirmationEmail } from "@/lib/email";
import type { PaymentProvider } from "./types";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: "Credit/Debit Card (Stripe)",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "Pay at Lodge",
};

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
      },
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
}

export type { PaymentProvider, PaymentInitResult, PaymentVerifyResult } from "./types";
