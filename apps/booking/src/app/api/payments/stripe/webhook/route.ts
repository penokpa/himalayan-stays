import { NextRequest, NextResponse } from "next/server";
import { completePayment } from "@/lib/payments";
import Stripe from "stripe";

// Pinned to nodejs runtime: Edge can't reliably hand the raw body bytes
// that the HMAC signature is computed over.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    // SignatureVerificationError, replay protection, or malformed payload.
    console.error(
      "[stripe/webhook] Signature verification failed:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bookingRef = session.metadata?.bookingRef;

      if (bookingRef && session.payment_status === "paid") {
        await completePayment(
          bookingRef,
          "STRIPE",
          (session.payment_intent as string) ?? session.id,
          (session.amount_total ?? 0) / 100,
          "USD"
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Signature was valid but processing failed (DB error, etc).
    // Return 500 so Stripe retries.
    console.error("[stripe/webhook] Processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
