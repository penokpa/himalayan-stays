import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MESSAGE_BODY_MAX, ownerThreadUrl } from "@/lib/messaging";
import { sendMessageNotificationEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
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
      where: { accessToken: token },
      include: { lodge: { select: { name: true, owner: { select: { name: true, email: true } } } } },
    });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (thread.status === "CLOSED") {
      return NextResponse.json({ error: "Thread is closed" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.message.create({
        data: { threadId: thread.id, sender: "TREKKER", body: message },
      });
      await tx.messageThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: new Date(),
          ownerUnread: { increment: 1 },
        },
      });
    });

    if (thread.lodge.owner.email) {
      void sendMessageNotificationEmail({
        to: thread.lodge.owner.email,
        recipientName: thread.lodge.owner.name,
        fromName: thread.trekkerName,
        lodgeName: thread.lodge.name,
        subject: thread.subject,
        body: message,
        threadUrl: ownerThreadUrl(thread.id),
        forOwner: true,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/messages/[token]/reply error:", err);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
