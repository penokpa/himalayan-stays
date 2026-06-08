import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_TTL_HOURS = 24;
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
      select: { id: true, name: true, email: true, emailVerifiedAt: true },
    });

    // Always return success — don't leak whether the account exists or is already verified.
    if (user && user.email && !user.emailVerifiedAt) {
      // Invalidate previous outstanding tokens for cleanliness
      await prisma.emailVerification.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      const token = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
      await prisma.emailVerification.create({
        data: { userId: user.id, token, expiresAt },
      });
      void sendVerificationEmail({
        to: user.email,
        name: user.name,
        verifyUrl: `${SITE_URL}/verify-email/${token}`,
        expiresInHours: TOKEN_TTL_HOURS,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/resend-verification error:", err);
    return NextResponse.json({ ok: true }); // do not leak
  }
}
