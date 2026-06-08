export const dynamic = "force-dynamic";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnerProgress } from "@/lib/owner-onboarding";
import OwnerOnboarding from "@/components/OwnerOnboarding";

function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default async function OwnerDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return <p className="text-gray-500">Not authenticated.</p>;
  }

  const incompleteLodges = await getOwnerProgress(userId);

  const [lodgeCount, lodgeIds, recentLegs] = await Promise.all([
    prisma.lodge.count({ where: { ownerId: userId } }),
    prisma.lodge.findMany({ where: { ownerId: userId }, select: { id: true } }),
    prisma.bookingLeg.findMany({
      where: { lodge: { ownerId: userId } },
      orderBy: { checkInDate: "asc" },
      take: 5,
      include: {
        lodge: { select: { name: true } },
        room: { select: { name: true } },
        booking: { select: { bookingRef: true, bookedBy: { select: { name: true } }, status: true } },
      },
    }),
  ]);

  const ids = lodgeIds.map((l) => l.id);

  const [bookingCount, confirmedCount, pendingCount, completedPaymentSum, cashHoldCount, unreadMessages] =
    await Promise.all([
      prisma.bookingLeg.count({ where: { lodgeId: { in: ids } } }),
      prisma.bookingLeg.count({
        where: { lodgeId: { in: ids }, status: "CONFIRMED" },
      }),
      prisma.bookingLeg.count({
        where: { lodgeId: { in: ids }, status: "PENDING" },
      }),
      prisma.bookingLeg.aggregate({
        where: {
          lodgeId: { in: ids },
          booking: { paymentStatus: "COMPLETED" },
        },
        _sum: { legTotal: true },
      }),
      prisma.bookingLeg.count({
        where: {
          lodgeId: { in: ids },
          booking: {
            status: "CONFIRMED",
            payments: { some: { method: "CASH", status: "INITIATED" } },
          },
        },
      }),
      prisma.messageThread.count({
        where: { lodgeId: { in: ids }, ownerUnread: { gt: 0 } },
      }),
    ]);

  const collectedNpr = Number(completedPaymentSum._sum.legTotal ?? 0);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-stone-100">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-stone-400">
        Welcome, {session.user.name ?? "lodge owner"}.
      </p>

      {(lodgeCount === 0 || incompleteLodges.length > 0) && (
        <div className="mt-6">
          <OwnerOnboarding
            list={incompleteLodges}
            hasAnyLodge={lodgeCount > 0}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Lodges" value={String(lodgeCount)} accent="text-gray-900" />
        <StatCard label="Total Bookings" value={String(bookingCount)} accent="text-gray-900" />
        <StatCard
          label="Confirmed"
          value={String(confirmedCount)}
          accent="text-green-600"
        />
        <StatCard
          label="Pending"
          value={String(pendingCount)}
          accent="text-yellow-600"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Revenue Collected"
          value={`NPR ${collectedNpr.toLocaleString()}`}
          accent="text-emerald-600"
          hint="From legs at your lodges with paid bookings"
        />
        <StatCard
          label="Cash on Arrival"
          value={String(cashHoldCount)}
          accent="text-amber-600"
          hint="Stays you'll collect cash for at the lodge"
        />
        <Link href="/owner/messages" className="block transition hover:scale-[1.01]">
          <StatCard
            label="Unread Messages"
            value={String(unreadMessages)}
            accent={unreadMessages > 0 ? "text-emerald-600" : "text-gray-400"}
            hint={unreadMessages > 0 ? "Click to open inbox" : "All caught up"}
          />
        </Link>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-gray-900">Upcoming Stays</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lodge / Room</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Check-in</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLegs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    No upcoming stays at your lodges.
                  </td>
                </tr>
              ) : (
                recentLegs.map((leg) => (
                  <tr key={leg.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono">
                      <Link
                        href={`/owner/bookings#${leg.booking.bookingRef}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {leg.booking.bookingRef}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {leg.booking.bookedBy.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {leg.lodge.name} <span className="text-gray-400">· {leg.room.name}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {new Date(leg.checkInDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                      NPR {Number(leg.legTotal).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
