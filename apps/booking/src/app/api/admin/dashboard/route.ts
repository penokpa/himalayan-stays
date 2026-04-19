import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [totalLodges, totalBookings, bookingsByStatus, recentBookings] =
      await Promise.all([
        prisma.lodge.count(),
        prisma.booking.count(),
        prisma.booking.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
        prisma.booking.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            bookedBy: { select: { name: true, email: true } },
            legs: {
              include: {
                lodge: { select: { name: true } },
              },
            },
          },
        }),
      ]);

    // Transform groupBy result into a cleaner object
    const statusCounts = bookingsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      totalLodges,
      totalBookings,
      bookingsByStatus: statusCounts,
      recentBookings,
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
