import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MESSAGE_BODY_MAX, trekkerThreadUrl } from "@/lib/messaging";
import { sendMessageNotificationEmail } from "@/lib/email";

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
    const body = (await request.json().catch(() => ({}))) as { message?: string };
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.length > MESSAGE_BODY_MAX) {
      return NextResponse.json(
        { error: `Message too long (max ${MESSAGE_BODY_MAX} chars)` },
        { status: 400 }
      );
    }

    const thread = await prisma.messageThread.findUnique({
      where: { id },
      include: { lodge: { select: { name: true, ownerId: true } } },
    });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (role !== "ADMIN" && thread.lodge.ownerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (thread.status === "CLOSED") {
      return NextResponse.json({ error: "Thread is closed" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.message.create({
        data: { threadId: thread.id, sender: "OWNER", body: message },
      });
      await tx.messageThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: new Date(),
          trekkerUnread: { increment: 1 },
          ownerUnread: 0,
        },
      });
    });

    void sendMessageNotificationEmail({
      to: thread.trekkerEmail,
      recipientName: thread.trekkerName,
      fromName: thread.lodge.name,
      lodgeName: thread.lodge.name,
      subject: thread.subject,
      body: message,
      threadUrl: trekkerThreadUrl(thread.accessToken),
      forOwner: false,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/owner/messages/[id]/reply error:", err);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
