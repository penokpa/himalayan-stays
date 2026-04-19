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
