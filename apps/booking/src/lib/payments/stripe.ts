import Stripe from "stripe";
import type { PaymentProvider, PaymentInitResult, PaymentVerifyResult } from "./types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export const stripeProvider: PaymentProvider = {
  async initiate({ bookingRef, amount, currency, callbackBaseUrl }): Promise<PaymentInitResult> {
    // Stripe amounts are in smallest currency unit (cents for USD, paisa for NPR)
    // Use USD for Stripe since NPR is not well-supported
    const unitAmount = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name: `Himalayan Stays Booking: ${bookingRef}`,
              description: "Trek lodge accommodation booking",
            },
          },
          quantity: 1,
        },
      ],
      metadata: { bookingRef },
      success_url: `${callbackBaseUrl}/api/payments/stripe/callback?session_id={CHECKOUT_SESSION_ID}&booking_ref=${bookingRef}`,
      cancel_url: `${callbackBaseUrl}/booking/${bookingRef}/pay?payment=cancelled`,
    });

    if (!session.url) {
      throw new Error("Failed to create Stripe checkout session");
    }

    return { redirectUrl: session.url };
  },

  async verify(params): Promise<PaymentVerifyResult> {
    const sessionId = params.session_id;
    if (!sessionId) throw new Error("Missing session_id");

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
      success: session.payment_status === "paid",
      providerTxnId: (session.payment_intent as string) ?? session.id,
      amount: (session.amount_total ?? 0) / 100,
      metadata: { bookingRef: session.metadata?.bookingRef ?? null },
    };
  },
};

export { stripe };
