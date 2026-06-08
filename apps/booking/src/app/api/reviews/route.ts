import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewReviewEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      bookingRef,
      lodgeId,
      email,
      rating,
      comment,
    } = body as {
      bookingRef?: string;
      lodgeId?: string;
      email?: string;
      rating?: number;
      comment?: string;
    };

    if (!bookingRef || !lodgeId || !email || typeof rating !== "number") {
      return NextResponse.json(
        { error: "bookingRef, lodgeId, email, and rating are required" },
        { status: 400 }
      );
    }
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const booking = await prisma.booking.findUnique({
      where: { bookingRef },
      include: {
        bookedBy: { select: { id: true, email: true } },
        legs: { select: { id: true, lodgeId: true } },
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if ((booking.bookedBy.email ?? "").toLowerCase() !== normalizedEmail) {
      return NextResponse.json(
        { error: "Email doesn't match this booking" },
        { status: 403 }
      );
    }
    if (booking.status !== "COMPLETED" && booking.status !== "CHECKED_IN") {
      return NextResponse.json(
        {
          error:
            "Reviews can only be submitted after your stay. Current status: " +
            booking.status.toLowerCase().replace("_", " "),
        },
        { status: 400 }
      );
    }

    const leg = booking.legs.find((l) => l.lodgeId === lodgeId);
    if (!leg) {
      return NextResponse.json(
        { error: "This booking doesn't include the specified lodge" },
        { status: 400 }
      );
    }

    const existing = await prisma.review.findFirst({
      where: { bookingLegId: leg.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You've already reviewed this stay" },
        { status: 409 }
      );
    }

    const review = await prisma.review.create({
      data: {
        bookingLegId: leg.id,
        userId: booking.bookedBy.id,
        lodgeId,
        rating,
        comment: comment?.trim() || null,
      },
      select: { id: true },
    });

    // Notify the lodge owner — non-blocking
    void notifyOwnerOfReview(review.id);

    return NextResponse.json({ ok: true, reviewId: review.id });
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}

async function notifyOwnerOfReview(reviewId: string): Promise<void> {
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { name: true, nationality: true } },
        lodge: {
          select: {
            name: true,
            owner: { select: { name: true, email: true } },
          },
        },
      },
    });
    if (!review || !review.lodge.owner.email) return;

    await sendNewReviewEmail({
      to: review.lodge.owner.email,
      ownerName: review.lodge.owner.name,
      lodgeName: review.lodge.name,
      reviewerName: review.user.name,
      reviewerNationality: review.user.nationality,
      rating: review.rating,
      comment: review.comment,
      reviewUrl: `${SITE_URL}/owner/reviews?filter=unreplied`,
    });
  } catch (err) {
    console.error("[notifyOwnerOfReview] failed:", err);
  }
}
