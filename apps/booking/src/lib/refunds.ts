import { prisma } from "@/lib/prisma";
import { logBookingEvent } from "@/lib/audit";
import type { Prisma, Refund, PaymentMethod } from "@prisma/client";

export interface RefundInput {
  bookingRef: string;
  amountNpr: number;
  reason?: string;
  initiatedById?: string;
  initiatedByEmail?: string;
}

export interface RefundOutcome {
  refund: Refund;
  message: string;
}

/**
 * Create a refund for a booking. Picks the most recent COMPLETED Payment to refund against.
 * - STRIPE: calls Stripe refunds.create() and marks COMPLETED
 * - ESEWA / KHALTI: creates MANUAL_PENDING refund — operator must process via provider dashboard
 * - CASH: instantly COMPLETED (no money was actually collected by us)
 *
 * If the cumulative refunded amount equals the total payment, the booking is set to status REFUNDED.
 */
export async function refundBooking(input: RefundInput): Promise<RefundOutcome> {
  const { bookingRef, amountNpr, reason, initiatedById } = input;

  if (!Number.isFinite(amountNpr) || amountNpr <= 0) {
    throw new Error("Refund amount must be positive");
  }

  const booking = await prisma.booking.findUnique({
    where: { bookingRef },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      refunds: true,
    },
  });
  if (!booking) throw new Error(`Booking ${bookingRef} not found`);

  const completedPayment = booking.payments.find((p) => p.status === "COMPLETED");
  const cashPayment = booking.payments.find(
    (p) => p.method === "CASH" && p.status === "INITIATED"
  );
  const payment = completedPayment ?? cashPayment;
  if (!payment) {
    throw new Error("No payment found to refund against");
  }

  const alreadyRefunded = booking.refunds
    .filter((r) => r.status === "COMPLETED" || r.status === "MANUAL_PENDING" || r.status === "INITIATED")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const remaining = Number(payment.amount) - alreadyRefunded;
  if (amountNpr > remaining + 0.01) {
    throw new Error(
      `Refund exceeds remaining amount (NPR ${remaining.toFixed(2)} available)`
    );
  }

  const method: PaymentMethod = payment.method;
  let initialStatus: "INITIATED" | "COMPLETED" | "MANUAL_PENDING";
  if (method === "STRIPE") initialStatus = "INITIATED";
  else if (method === "CASH") initialStatus = "COMPLETED";
  else initialStatus = "MANUAL_PENDING";

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      bookingId: booking.id,
      amount: amountNpr,
      currency: payment.currency,
      method,
      status: initialStatus,
      reason: reason?.trim() || null,
      initiatedById: initiatedById ?? null,
      completedAt: initialStatus === "COMPLETED" ? new Date() : null,
    },
  });

  let message = "";
  let finalStatus: "INITIATED" | "COMPLETED" | "MANUAL_PENDING" | "FAILED" = initialStatus;
  let providerRefundId: string | null = null;

  if (method === "STRIPE") {
    try {
      if (!payment.providerTxnId) {
        throw new Error("Original Stripe session has no providerTxnId");
      }
      // Stripe expects amount in cents; the original payment was charged in USD via the
      // Stripe checkout flow, so we refund using the original payment_intent retrieved from the session.
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
      const session = await stripe.checkout.sessions.retrieve(payment.providerTxnId);
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (!paymentIntentId) {
        throw new Error("Stripe session has no payment_intent");
      }
      // Charged in USD originally — convert NPR refund amount to USD using same rate
      const nprPerUsd = Number(process.env.NPR_PER_USD ?? 135);
      const refundUsdCents = Math.round((amountNpr / nprPerUsd) * 100);

      const stripeRefund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: refundUsdCents,
        reason: "requested_by_customer",
        metadata: { bookingRef, refundId: refund.id },
      });
      providerRefundId = stripeRefund.id;
      finalStatus = "COMPLETED";
      message = `Refunded $${(refundUsdCents / 100).toFixed(2)} via Stripe (${stripeRefund.id})`;
    } catch (err) {
      finalStatus = "FAILED";
      message =
        err instanceof Error
          ? `Stripe refund failed: ${err.message}`
          : "Stripe refund failed";
      console.error("[refunds] Stripe refund failed:", err);
    }
  } else if (method === "CASH") {
    message = "Cash hold cancelled — no money was collected by the platform.";
  } else {
    message = `${method} refunds must be processed manually via the ${method} dashboard. Mark complete here once done.`;
  }

  const updated = await prisma.refund.update({
    where: { id: refund.id },
    data: {
      status: finalStatus,
      providerRefundId,
      completedAt: finalStatus === "COMPLETED" ? new Date() : null,
    },
  });

  await logBookingEvent({
    bookingId: booking.id,
    type: "refund_created",
    actor: input.initiatedByEmail
      ? { id: initiatedById ?? null, email: input.initiatedByEmail, role: "ADMIN" }
      : { role: "ADMIN" },
    metadata: {
      refundId: updated.id,
      amount: amountNpr,
      method,
      status: finalStatus,
      reason: reason ?? null,
      providerRefundId,
    },
  });

  // If the cumulative completed-or-pending refunds equal the total booking, mark booking REFUNDED + cancel
  await maybeMarkBookingRefunded(booking.id);

  return { refund: updated, message };
}

async function maybeMarkBookingRefunded(bookingId: string): Promise<void> {
  const fresh = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payments: true, refunds: true },
  });
  if (!fresh) return;
  const totalPaid = fresh.payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalRefunded = fresh.refunds
    .filter((r) => r.status === "COMPLETED" || r.status === "MANUAL_PENDING")
    .reduce((s, r) => s + Number(r.amount), 0);
  if (totalPaid > 0 && totalRefunded + 0.01 >= totalPaid) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "REFUNDED",
        status: fresh.status === "COMPLETED" || fresh.status === "CHECKED_IN"
          ? fresh.status
          : "CANCELLED",
      },
    });
  }
}

export async function listRefundsForBooking(bookingId: string) {
  return prisma.refund.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
    include: {
      initiatedBy: { select: { name: true, email: true } },
    },
  });
}

/** Mark an INITIATED or MANUAL_PENDING refund as COMPLETED (e.g. after operator processes eSewa refund). */
export async function markRefundCompleted(
  refundId: string,
  providerRefundId?: string
): Promise<Refund> {
  const refund = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: "COMPLETED",
      providerRefundId: providerRefundId ?? undefined,
      completedAt: new Date(),
    },
  });
  await maybeMarkBookingRefunded(refund.bookingId);
  return refund;
}

export type { Prisma };
