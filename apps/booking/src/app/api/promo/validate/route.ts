import { NextRequest, NextResponse } from "next/server";
import { evaluatePromo } from "@/lib/promo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { code, totalNpr } = body as { code?: string; totalNpr?: number };
    if (!code) return NextResponse.json({ ok: false, error: "Code is required" }, { status: 400 });
    if (typeof totalNpr !== "number" || totalNpr < 0) {
      return NextResponse.json({ ok: false, error: "Invalid totalNpr" }, { status: 400 });
    }
    const result = await evaluatePromo(code, totalNpr);
    if (!result.ok) return NextResponse.json(result, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/promo/validate error:", error);
    return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 500 });
  }
}
