import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider, completePayment } from "@/lib/payments";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Log all params for debugging
  const allParams: Record<string, string> = {};
  searchParams.forEach((v, k) => (allParams[k] = v));
  console.log("[eSewa callback] Received params:", allParams);

  let bookingRef = searchParams.get("booking_ref");
  let data = searchParams.get("data");

  // Handle eSewa's bug where they sometimes append ?data=... instead of &data=...
  // resulting in booking_ref="HS-...?data=..."
  if (bookingRef?.includes("?data=")) {
    const [realRef, rest] = bookingRef.split("?data=");
    bookingRef = realRef;
    data = rest;
  }

  if (!bookingRef) {
    console.error("[eSewa callback] Missing booking_ref");
    return NextResponse.redirect(new URL("/treks", request.nextUrl.origin));
  }

  if (!data) {
    console.error("[eSewa callback] Missing data param");
    return NextResponse.redirect(
      new URL(`/booking/${bookingRef}/pay?payment=failed`, request.nextUrl.origin)
    );
  }

  try {
    // Decode eSewa response for logging
    try {
      const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
      console.log("[eSewa callback] Decoded data:", decoded);
    } catch (e) {
      console.log("[eSewa callback] Could not decode data:", e);
    }

    const provider = getPaymentProvider("ESEWA");
    const result = await provider.verify({ data });

    console.log("[eSewa callback] Verify result:", result);

    if (result.success) {
      await completePayment(
        bookingRef,
        "ESEWA",
        result.providerTxnId,
        result.amount,
        "NPR"
      );
      return NextResponse.redirect(
        new URL(`/booking/${bookingRef}/confirmation?payment=success`, request.nextUrl.origin)
      );
    }

    return NextResponse.redirect(
      new URL(`/booking/${bookingRef}/pay?payment=failed`, request.nextUrl.origin)
    );
  } catch (error) {
    console.error("[eSewa callback] Error:", error);
    return NextResponse.redirect(
      new URL(`/booking/${bookingRef}/pay?payment=failed`, request.nextUrl.origin)
    );
  }
}
