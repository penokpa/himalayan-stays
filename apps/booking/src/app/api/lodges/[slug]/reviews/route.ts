import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const lodge = await prisma.lodge.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!lodge) {
    return NextResponse.json({ error: "Lodge not found" }, { status: 404 });
  }

  const reviews = await prisma.review.findMany({
    where: { lodgeId: lodge.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      photos: true,
      user: { select: { name: true, nationality: true } },
    },
  });

  const count = reviews.length;
  const avg = count === 0 ? null : reviews.reduce((sum, r) => sum + r.rating, 0) / count;

  return NextResponse.json({
    reviews,
    avgRating: avg,
    count,
  });
}
