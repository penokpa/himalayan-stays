import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider, completePayment } from "@/lib/payments";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bookingRef = searchParams.get("booking_ref") ?? searchParams.get("purchase_order_id");
  const pidx = searchParams.get("pidx");

  if (!bookingRef || !pidx) {
    return NextResponse.redirect(
      new URL("/treks", request.nextUrl.origin)
    );
  }

  try {
    const provider = getPaymentProvider("KHALTI");
    const result = await provider.verify({ pidx });

    if (result.success) {
      await completePayment(
        bookingRef,
        "KHALTI",
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
    console.error("Khalti callback error:", error);
    return NextResponse.redirect(
      new URL(`/booking/${bookingRef}/pay?payment=failed`, request.nextUrl.origin)
    );
  }
}
