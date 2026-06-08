import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_HOURS = 1;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    // Always respond the same — don't leak account existence.
    if (user && user.email) {
      const token = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

      await prisma.passwordReset.create({
        data: { userId: user.id, token, expiresAt },
      });

      void sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: `${SITE_URL}/reset-password/${token}`,
        expiresInHours: TOKEN_TTL_HOURS,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/forgot error:", err);
    return NextResponse.json({ ok: true }); // intentionally do not leak
  }
}
