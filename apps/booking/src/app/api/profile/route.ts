import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const NAME_MAX = 100;
const PHONE_MAX = 30;
const NATIONALITY_MAX = 60;
const PASSPORT_MAX = 30;

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      phone?: string | null;
      nationality?: string | null;
      passportNumber?: string | null;
      profilePhoto?: string | null;
    };

    const name = clean(body.name, NAME_MAX);
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const data: Record<string, string | null> = { name };
    if ("phone" in body) data.phone = clean(body.phone, PHONE_MAX);
    if ("nationality" in body) data.nationality = clean(body.nationality, NATIONALITY_MAX);
    if ("passportNumber" in body) data.passportNumber = clean(body.passportNumber, PASSPORT_MAX);
    if ("profilePhoto" in body) {
      const v = body.profilePhoto;
      if (v === null || v === "") data.profilePhoto = null;
      else if (typeof v === "string" && /^https?:\/\//.test(v)) data.profilePhoto = v;
    }

    await prisma.user.update({ where: { id: userId }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
