import { NextResponse } from "next/server";
import { confirmPayAtLodge } from "@/lib/payments";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  try {
    await confirmPayAtLodge(ref);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/bookings/[ref]/confirm-cash error:", error);
    return NextResponse.json(
      { error: "Failed to confirm pay-at-lodge booking" },
      { status: 500 }
    );
  }
}
