import type { PaymentProvider, PaymentInitResult, PaymentVerifyResult } from "./types";

const SECRET_KEY = process.env.KHALTI_SECRET_KEY ?? "";
const GATEWAY_URL = process.env.KHALTI_GATEWAY_URL ?? "https://a.khalti.com";

export const khaltiProvider: PaymentProvider = {
  async initiate({ bookingRef, amount, callbackBaseUrl }): Promise<PaymentInitResult> {
    // Khalti expects amount in paisa (1 NPR = 100 paisa)
    const amountInPaisa = Math.round(amount * 100);

    const res = await fetch(`${GATEWAY_URL}/api/v2/epayment/initiate/`, {
      method: "POST",
      headers: {
        Authorization: `Key ${SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        return_url: `${callbackBaseUrl}/api/payments/khalti/callback?booking_ref=${bookingRef}`,
        website_url: callbackBaseUrl,
        amount: amountInPaisa,
        purchase_order_id: bookingRef,
        purchase_order_name: "Himalayan Stays Booking",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Khalti initiation failed: ${err}`);
    }

    const data = await res.json();
    return { redirectUrl: data.payment_url };
  },

  async verify(params): Promise<PaymentVerifyResult> {
    const pidx = params.pidx;
    if (!pidx) throw new Error("Missing Khalti pidx");

    const res = await fetch(`${GATEWAY_URL}/api/v2/epayment/lookup/`, {
      method: "POST",
      headers: {
        Authorization: `Key ${SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pidx }),
    });

    if (!res.ok) {
      return { success: false, providerTxnId: pidx, amount: 0 };
    }

    const data = await res.json();
    return {
      success: data.status === "Completed",
      providerTxnId: data.transaction_id ?? pidx,
      amount: (data.total_amount ?? 0) / 100, // Convert paisa back to NPR
    };
  },
};
