export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PENDING_HOLD_MINUTES } from "@/lib/booking-utils";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: "Card (Stripe)",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "Pay at Lodge",
  BANK_TRANSFER: "Bank transfer",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CHECKED_IN: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-orange-100 text-orange-800",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function fmtNpr(n: number): string {
  return `NPR ${Math.round(n).toLocaleString()}`;
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? "text-gray-900"}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * MS_PER_DAY);
  const since30dStart = new Date(
    Date.UTC(since30d.getUTCFullYear(), since30d.getUTCMonth(), since30d.getUTCDate())
  );

  const [
    paymentsAllTime,
    payments30d,
    refundsAllTime,
    refunds30d,
    bookingsByStatus,
    paymentsByMethod30d,
    legsTouching30d,
    activeLodgeCount,
    activeRoomCount,
    recentPayments,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED", paidAt: { gte: since30d } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.refund.aggregate({
      where: { status: { in: ["COMPLETED", "MANUAL_PENDING"] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.refund.aggregate({
      where: {
        status: { in: ["COMPLETED", "MANUAL_PENDING"] },
        createdAt: { gte: since30d },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { status: "COMPLETED", paidAt: { gte: since30d } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    // Booked rooms touching the last 30 days (for occupancy)
    prisma.bookingLeg.findMany({
      where: {
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        checkInDate: { lt: now },
        checkOutDate: { gt: since30dStart },
        booking: {
          OR: [
            { status: { not: "PENDING" } },
            {
              status: "PENDING",
              createdAt: { gte: new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000) },
            },
          ],
        },
      },
      select: { checkInDate: true, checkOutDate: true },
    }),
    prisma.lodge.count({ where: { isActive: true } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.payment.findMany({
      where: { status: "COMPLETED", paidAt: { gte: since30d } },
      select: { amount: true, paidAt: true },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  // Revenue by lodge (top 10) — sum of completed BookingLeg totals
  const legAgg = await prisma.bookingLeg.groupBy({
    by: ["lodgeId"],
    where: { booking: { paymentStatus: "COMPLETED" } },
    _sum: { legTotal: true },
  });
  const lodgeMap = new Map<string, { name: string; village: string }>();
  if (legAgg.length > 0) {
    const lodges = await prisma.lodge.findMany({
      where: { id: { in: legAgg.map((l) => l.lodgeId) } },
      select: { id: true, name: true, village: true },
    });
    for (const l of lodges) lodgeMap.set(l.id, { name: l.name, village: l.village });
  }
  const revenueByLodge = legAgg
    .map((r) => ({
      lodge: lodgeMap.get(r.lodgeId),
      revenue: Number(r._sum.legTotal ?? 0),
    }))
    .filter((x) => x.lodge)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Occupancy over last 30 days: room-nights occupied / room-nights available
  const totalRoomNightsAvailable = activeRoomCount * 30;
  let occupiedRoomNights = 0;
  for (const leg of legsTouching30d) {
    const start = leg.checkInDate < since30dStart ? since30dStart : leg.checkInDate;
    const end = leg.checkOutDate > now ? now : leg.checkOutDate;
    const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY));
    occupiedRoomNights += nights;
  }
  const occupancyPct =
    totalRoomNightsAvailable > 0
      ? (occupiedRoomNights / totalRoomNightsAvailable) * 100
      : 0;

  // 30-day daily revenue (NPR)
  const dailySeries: { iso: string; revenue: number }[] = [];
  const dayBuckets = new Map<string, number>();
  for (const p of recentPayments) {
    if (!p.paidAt) continue;
    const iso = p.paidAt.toISOString().slice(0, 10);
    dayBuckets.set(iso, (dayBuckets.get(iso) ?? 0) + Number(p.amount));
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * MS_PER_DAY);
    const iso = d.toISOString().slice(0, 10);
    dailySeries.push({ iso, revenue: dayBuckets.get(iso) ?? 0 });
  }
  const maxDaily = Math.max(1, ...dailySeries.map((d) => d.revenue));

  const allTimeRevenue = Number(paymentsAllTime._sum.amount ?? 0);
  const allTimeRefunded = Number(refundsAllTime._sum.amount ?? 0);
  const allTimeNet = allTimeRevenue - allTimeRefunded;
  const revenue30d = Number(payments30d._sum.amount ?? 0);
  const refunded30d = Number(refunds30d._sum.amount ?? 0);

  const statusMap = Object.fromEntries(
    bookingsByStatus.map((b) => [b.status, b._count._all])
  );
  const totalBookings = bookingsByStatus.reduce((s, b) => s + b._count._all, 0);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <p className="mt-1 text-sm text-gray-500">
        Platform-wide revenue, occupancy, and booking trends.
      </p>

      {/* Top stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue (30d)"
          value={fmtNpr(revenue30d)}
          hint={`${payments30d._count._all} payments`}
          accent="text-emerald-600"
        />
        <StatCard
          label="Net revenue (all-time)"
          value={fmtNpr(allTimeNet)}
          hint={`${fmtNpr(allTimeRevenue)} paid · ${fmtNpr(allTimeRefunded)} refunded`}
          accent="text-emerald-700"
        />
        <StatCard
          label="Occupancy (30d)"
          value={`${occupancyPct.toFixed(1)}%`}
          hint={`${occupiedRoomNights.toLocaleString()} of ${totalRoomNightsAvailable.toLocaleString()} room-nights`}
          accent="text-indigo-600"
        />
        <StatCard
          label="Active lodges / rooms"
          value={`${activeLodgeCount} / ${activeRoomCount}`}
          hint={`${totalBookings} total bookings`}
        />
      </div>

      {/* 30-day revenue chart */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Revenue · last 30 days</h2>
          <p className="text-xs text-gray-500">
            Refunds in last 30d: <span className="font-semibold text-rose-600">{fmtNpr(refunded30d)}</span>
          </p>
        </div>
        <div className="mt-4 flex h-40 items-end gap-1">
          {dailySeries.map((d) => {
            const h = (d.revenue / maxDaily) * 100;
            return (
              <div
                key={d.iso}
                className="flex flex-1 flex-col items-center justify-end"
                title={`${d.iso}: ${fmtNpr(d.revenue)}`}
              >
                <div
                  className="w-full rounded-t bg-emerald-500/70 hover:bg-emerald-600"
                  style={{ height: `${h}%`, minHeight: d.revenue > 0 ? "2px" : "0" }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-gray-400">
          <span>{dailySeries[0]?.iso}</span>
          <span>{dailySeries[dailySeries.length - 1]?.iso}</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bookings by status */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Bookings by status</h2>
          <p className="mt-1 text-xs text-gray-500">
            All-time, including pending and cancelled.
          </p>
          <ul className="mt-4 space-y-2">
            {[
              "PENDING",
              "CONFIRMED",
              "CHECKED_IN",
              "COMPLETED",
              "CANCELLED",
              "NO_SHOW",
            ].map((s) => {
              const count = statusMap[s] ?? 0;
              const pct = totalBookings > 0 ? (count / totalBookings) * 100 : 0;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className={`inline-flex w-28 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[s]}`}
                  >
                    {s.replace("_", " ")}
                  </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-sm font-medium text-gray-700">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Revenue by payment method */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Revenue by method · 30d
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Where the {fmtNpr(revenue30d)} of recent payments came from.
          </p>
          {paymentsByMethod30d.length === 0 ? (
            <p className="mt-4 text-sm italic text-gray-400">No payments yet in the last 30 days.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {paymentsByMethod30d
                .map((m) => ({
                  method: m.method,
                  amount: Number(m._sum.amount ?? 0),
                  count: m._count._all,
                }))
                .sort((a, b) => b.amount - a.amount)
                .map((m) => {
                  const pct = revenue30d > 0 ? (m.amount / revenue30d) * 100 : 0;
                  return (
                    <li key={m.method} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm font-medium text-gray-700">
                        {PAYMENT_METHOD_LABELS[m.method] ?? m.method}
                      </span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="absolute inset-y-0 left-0 bg-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-sm font-medium text-gray-700">
                        {fmtNpr(m.amount)}
                      </span>
                      <span className="w-10 shrink-0 text-right text-xs text-gray-400">
                        {m.count}
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>

      {/* Top lodges by revenue */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Top lodges by revenue</h2>
        <p className="mt-1 text-xs text-gray-500">
          All-time, from completed bookings only.
        </p>
        {revenueByLodge.length === 0 ? (
          <p className="mt-4 text-sm italic text-gray-400">No completed bookings yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Lodge
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Village
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {revenueByLodge.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {r.lodge?.name}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.lodge?.village}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                      {fmtNpr(r.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 text-right">
          <Link
            href="/admin/bookings"
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            View all bookings →
          </Link>
        </div>
      </div>
    </>
  );
}
