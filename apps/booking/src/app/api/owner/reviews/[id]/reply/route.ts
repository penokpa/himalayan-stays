import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const MAX_REPLY = 2000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { reply?: string };
    const reply = body.reply?.trim();
    if (!reply) {
      return NextResponse.json({ error: "Reply is required" }, { status: 400 });
    }
    if (reply.length > MAX_REPLY) {
      return NextResponse.json(
        { error: `Reply too long (max ${MAX_REPLY} chars)` },
        { status: 400 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id },
      include: { lodge: { select: { ownerId: true } } },
    });
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (role !== "ADMIN" && review.lodge.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.review.update({
      where: { id },
      data: { ownerReply: reply, ownerReplyAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/owner/reviews/[id]/reply error:", err);
    return NextResponse.json({ error: "Failed to save reply" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const review = await prisma.review.findUnique({
      where: { id },
      include: { lodge: { select: { ownerId: true } } },
    });
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (role !== "ADMIN" && review.lodge.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.review.update({
      where: { id },
      data: { ownerReply: null, ownerReplyAt: null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/owner/reviews/[id]/reply error:", err);
    return NextResponse.json({ error: "Failed to delete reply" }, { status: 500 });
  }
}
