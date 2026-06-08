import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  newThreadToken,
  trekkerThreadUrl,
  ownerThreadUrl,
  isValidEmail,
  MESSAGE_BODY_MAX,
  MESSAGE_SUBJECT_MAX,
} from "@/lib/messaging";
import { sendMessageNotificationEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const subject = body.subject?.trim() || "Question about your lodge";
    const message = body.message?.trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (message.length > MESSAGE_BODY_MAX) {
      return NextResponse.json(
        { error: `Message too long (max ${MESSAGE_BODY_MAX} chars)` },
        { status: 400 }
      );
    }
    if (subject.length > MESSAGE_SUBJECT_MAX) {
      return NextResponse.json(
        { error: `Subject too long (max ${MESSAGE_SUBJECT_MAX} chars)` },
        { status: 400 }
      );
    }

    const lodge = await prisma.lodge.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        isActive: true,
        owner: { select: { name: true, email: true } },
      },
    });
    if (!lodge || !lodge.isActive) {
      return NextResponse.json({ error: "Lodge not found" }, { status: 404 });
    }

    const token = newThreadToken();
    const thread = await prisma.messageThread.create({
      data: {
        lodgeId: lodge.id,
        trekkerEmail: email,
        trekkerName: name,
        subject: subject.slice(0, MESSAGE_SUBJECT_MAX),
        accessToken: token,
        ownerUnread: 1,
        messages: {
          create: {
            sender: "TREKKER",
            body: message,
          },
        },
      },
      select: { id: true, accessToken: true },
    });

    if (lodge.owner.email) {
      void sendMessageNotificationEmail({
        to: lodge.owner.email,
        recipientName: lodge.owner.name,
        fromName: name,
        lodgeName: lodge.name,
        subject,
        body: message,
        threadUrl: ownerThreadUrl(thread.id),
        forOwner: true,
      });
    }
    void sendMessageNotificationEmail({
      to: email,
      recipientName: name,
      fromName: lodge.name,
      lodgeName: lodge.name,
      subject,
      body: `Thanks for reaching out — your message was sent to ${lodge.name}. They'll reply by email and you can also follow the conversation here:\n\n${trekkerThreadUrl(thread.accessToken)}\n\nYour message:\n${message}`,
      threadUrl: trekkerThreadUrl(thread.accessToken),
      forOwner: false,
    });

    return NextResponse.json({
      ok: true,
      threadUrl: `/messages/${thread.accessToken}`,
    });
  } catch (err) {
    console.error("POST /api/lodges/[slug]/messages error:", err);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
