import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processReminders } from "@/lib/reminders";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processReminders();
  return NextResponse.json(result);
}
