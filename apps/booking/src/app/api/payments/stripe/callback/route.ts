import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider, completePayment } from "@/lib/payments";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get("session_id");
  const bookingRef = searchParams.get("booking_ref");

  if (!sessionId || !bookingRef) {
    return NextResponse.redirect(
      new URL("/treks", request.nextUrl.origin)
    );
  }

  try {
    const provider = getPaymentProvider("STRIPE");
    const result = await provider.verify({ session_id: sessionId });

    // Cross-check: the Stripe session's metadata bookingRef MUST match the URL's
    // bookingRef. Otherwise an attacker could pivot another trekker's session_id
    // to mark their own booking as paid.
    const sessionRef = result.metadata?.bookingRef;
    if (!sessionRef || sessionRef !== bookingRef) {
      console.error(
        "[stripe/callback] bookingRef mismatch — URL=%s sessionMetadata=%s",
        bookingRef,
        sessionRef
      );
      return NextResponse.redirect(
        new URL(`/booking/${bookingRef}/pay?payment=failed`, request.nextUrl.origin)
      );
    }

    if (result.success) {
      await completePayment(
        bookingRef,
        "STRIPE",
        result.providerTxnId,
        result.amount,
        "USD"
      );
      return NextResponse.redirect(
        new URL(`/booking/${bookingRef}/confirmation?payment=success`, request.nextUrl.origin)
      );
    }

    return NextResponse.redirect(
      new URL(`/booking/${bookingRef}/pay?payment=failed`, request.nextUrl.origin)
    );
  } catch (error) {
    console.error("Stripe callback error:", error);
    return NextResponse.redirect(
      new URL(`/booking/${bookingRef}/pay?payment=failed`, request.nextUrl.origin)
    );
  }
}
