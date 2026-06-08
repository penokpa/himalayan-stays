export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-green-100 text-green-800",
    CHECKED_IN: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
    NO_SHOW: "bg-orange-100 text-orange-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

const PAYMENT_METHOD_SHORT: Record<string, string> = {
  STRIPE: "Card",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "Cash",
  BANK_TRANSFER: "Bank",
};

function PaymentBadge({
  bookingStatus,
  payments,
}: {
  bookingStatus: string;
  payments: { method: string; status: string }[];
}) {
  const completed = payments.find((p) => p.status === "COMPLETED");
  const cashHold = payments.find((p) => p.method === "CASH" && p.status === "INITIATED");

  if (completed) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        Paid · {PAYMENT_METHOD_SHORT[completed.method] ?? completed.method}
      </span>
    );
  }
  if (bookingStatus === "CONFIRMED" && cashHold) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        Cash on arrival
      </span>
    );
  }
  if (bookingStatus === "CANCELLED" || bookingStatus === "NO_SHOW") {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      Awaiting
    </span>
  );
}

function formatCurrency(value: Decimal | null | undefined): string {
  if (!value) return "--";
  return `NPR ${Number(value).toLocaleString()}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const [
    totalLodges,
    totalBookings,
    confirmedBookings,
    pendingBookings,
    revenueCollected,
    cashOnArrival,
    recentBookings,
  ] = await Promise.all([
    prisma.lodge.count(),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED", currency: "NPR" },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: {
        status: "CONFIRMED",
        payments: { some: { method: "CASH", status: "INITIATED" } },
      },
    }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        bookedBy: { select: { name: true, email: true } },
        legs: {
          include: {
            lodge: { select: { name: true } },
          },
        },
        payments: { select: { method: true, status: true } },
      },
    }),
  ]);

  const collectedNpr = Number(revenueCollected._sum.amount ?? 0);

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Lodges" value={totalLodges} accent="text-gray-900" />
        <StatCard label="Total Bookings" value={totalBookings} accent="text-gray-900" />
        <StatCard label="Confirmed Bookings" value={confirmedBookings} accent="text-green-600" />
        <StatCard label="Pending Bookings" value={pendingBookings} accent="text-yellow-600" />
      </div>

      {/* Revenue cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Revenue Collected</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            NPR {collectedNpr.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-400">Online payments only</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Cash on Arrival</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{cashOnArrival}</p>
          <p className="mt-1 text-xs text-gray-400">Confirmed bookings to collect at lodge</p>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Ref
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Guest
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Lodge(s)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Dates
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBookings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                      No bookings yet.
                    </td>
                  </tr>
                )}
                {recentBookings.map((booking) => {
                  const lodgeNames = [
                    ...new Set(booking.legs.map((l) => l.lodge.name)),
                  ].join(", ");
                  const firstLeg = booking.legs[0];
                  const lastLeg = booking.legs[booking.legs.length - 1];
                  const dateRange =
                    firstLeg && lastLeg
                      ? `${formatDate(firstLeg.checkInDate)} - ${formatDate(lastLeg.checkOutDate)}`
                      : "--";

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-mono">
                        <Link
                          href={`/admin/bookings/${booking.bookingRef}`}
                          className="text-indigo-600 hover:underline"
                        >
                          {booking.bookingRef}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {booking.bookedBy.name}
                      </td>
                      <td className="max-w-48 truncate px-4 py-3 text-sm text-gray-700">
                        {lodgeNames || "--"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {dateRange}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <PaymentBadge bookingStatus={booking.status} payments={booking.payments} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(booking.totalPriceNpr)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
