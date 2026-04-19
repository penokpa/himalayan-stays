import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider, completePayment } from "@/lib/payments";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingRef: string }> }
) {
  const { bookingRef } = await params;
  const { searchParams } = request.nextUrl;
  const data = searchParams.get("data");

  console.log("[eSewa callback]", { bookingRef, hasData: !!data });

  if (!data) {
    return NextResponse.redirect(
      new URL(`/booking/${bookingRef}/pay?payment=failed`, request.nextUrl.origin)
    );
  }

  try {
    try {
      const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
      console.log("[eSewa callback] Decoded:", decoded);
    } catch {}

    const provider = getPaymentProvider("ESEWA");
    const result = await provider.verify({ data });

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
