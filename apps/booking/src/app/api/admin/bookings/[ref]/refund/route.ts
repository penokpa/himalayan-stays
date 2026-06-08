import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refundBooking, markRefundCompleted } from "@/lib/refunds";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ref } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: "create" | "complete";
      amountNpr?: number | string;
      reason?: string;
      refundId?: string;
      providerRefundId?: string;
    };

    if (body.action === "complete") {
      if (!body.refundId) {
        return NextResponse.json({ error: "refundId required" }, { status: 400 });
      }
      const refund = await markRefundCompleted(body.refundId, body.providerRefundId);
      return NextResponse.json({ ok: true, refund });
    }

    const amountNum =
      typeof body.amountNpr === "string" ? Number(body.amountNpr) : body.amountNpr;
    if (!amountNum || !Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "amountNpr must be positive" }, { status: 400 });
    }

    const result = await refundBooking({
      bookingRef: ref,
      amountNpr: amountNum,
      reason: body.reason,
      initiatedById: session.user.id,
      initiatedByEmail: session.user.email ?? undefined,
    });

    return NextResponse.json({
      ok: true,
      refund: result.refund,
      message: result.message,
    });
  } catch (err) {
    console.error("POST /api/admin/bookings/[ref]/refund error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refund failed" },
      { status: 500 }
    );
  }
}
