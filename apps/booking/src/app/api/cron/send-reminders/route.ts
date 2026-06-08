import { NextRequest, NextResponse } from "next/server";
import { processReminders } from "@/lib/reminders";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 }
    );
  }
  // Vercel Cron sends Authorization: Bearer <secret>
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processReminders();
  return NextResponse.json(result);
}
