import { NextRequest, NextResponse } from "next/server";
import { quoteRoom } from "@/lib/pricing";
import {
  calculateCheckInDate,
  calculateCheckOutDate,
} from "@/lib/booking-utils";

interface StopInput {
  roomId: string;
  dayNumber: number;
  nights: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, stops } = body as {
      startDate: string;
      stops: StopInput[];
    };

    if (!startDate || !Array.isArray(stops) || stops.length === 0) {
      return NextResponse.json(
        { error: "startDate and stops are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate" },
        { status: 400 }
      );
    }

    const totals = await Promise.all(
      stops.map(async (stop) => {
        if (!stop.roomId) return 0;
        const checkIn = calculateCheckInDate(start, stop.dayNumber);
        const checkOut = calculateCheckOutDate(checkIn, stop.nights);
        const quote = await quoteRoom(stop.roomId, checkIn, checkOut);
        return quote.totalNpr;
      })
    );

    const grandTotal = totals.reduce((sum, t) => sum + t, 0);

    return NextResponse.json({ totals, grandTotal });
  } catch (error) {
    console.error("POST /api/pricing/quote error:", error);
    return NextResponse.json(
      { error: "Failed to quote pricing" },
      { status: 500 }
    );
  }
}
