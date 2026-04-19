import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PaymentMethod } from "@prisma/client";
import { getPaymentProvider } from "@/lib/payments";

const VALID_METHODS: PaymentMethod[] = ["STRIPE", "ESEWA", "KHALTI"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingRef, method } = body as {
      bookingRef: string;
      method: string;
    };

    if (!bookingRef || !method) {
      return NextResponse.json(
        { error: "bookingRef and method are required" },
        { status: 400 }
      );
    }

    if (!VALID_METHODS.includes(method as PaymentMethod)) {
      return NextResponse.json(
        { error: `Invalid payment method. Use: ${VALID_METHODS.join(", ")}` },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { bookingRef },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.paymentStatus === "COMPLETED") {
      return NextResponse.json(
        { error: "Payment already completed" },
        { status: 400 }
      );
    }

    const paymentMethod = method as PaymentMethod;
    const provider = getPaymentProvider(paymentMethod);

    // Use USD for Stripe, NPR for local wallets
    const isStripe = paymentMethod === "STRIPE";
    const amount = isStripe
      ? Number(booking.totalPriceUsd ?? booking.totalPriceNpr ?? 0)
      : Number(booking.totalPriceNpr ?? 0);
    const currency = isStripe ? "USD" : "NPR";

    const callbackBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      request.nextUrl.origin;

    // Create INITIATED payment record
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        method: paymentMethod,
        amount,
        currency,
        status: "INITIATED",
      },
    });

    // Update booking payment status
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: "INITIATED", currencyUsed: currency },
    });

    const result = await provider.initiate({
      bookingRef,
      amount,
      currency,
      callbackBaseUrl,
    });

    return NextResponse.json({ redirectUrl: result.redirectUrl });
  } catch (error) {
    console.error("POST /api/payments/initiate error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
