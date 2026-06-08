export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import type { BookingStatus } from "@prisma/client";

const STATUSES: { value: string; label: string }[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
];

const PAYMENT_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All Payments" },
  { value: "PAID", label: "Paid online" },
  { value: "CASH", label: "Cash on arrival" },
  { value: "AWAITING", label: "Awaiting" },
];

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

const PAGE_SIZE = 20;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string; page?: string }>;
}) {
  const { status: statusFilter, payment: paymentFilter, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter as BookingStatus;
  }
  if (paymentFilter === "PAID") {
    where.payments = { some: { status: "COMPLETED" } };
  } else if (paymentFilter === "CASH") {
    where.status = "CONFIRMED";
    where.payments = { some: { method: "CASH", status: "INITIATED" } };
  } else if (paymentFilter === "AWAITING") {
    where.payments = { none: {} };
  }

  const [bookings, totalCount] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        bookedBy: { select: { name: true } },
        legs: {
          include: {
            lodge: { select: { name: true } },
          },
          orderBy: { checkInDate: "asc" },
        },
        payments: { select: { method: true, status: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
    if (paymentFilter && paymentFilter !== "ALL") params.set("payment", paymentFilter);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    return `/admin/bookings${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Status:</span>
          <div className="flex flex-wrap gap-1">
            {STATUSES.map((s) => {
              const isActive = s.value === (statusFilter || "ALL");
              return (
                <Link
                  key={s.value}
                  href={buildUrl({
                    status: s.value === "ALL" ? "" : s.value,
                    page: "1",
                  })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Payment filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Payment:</span>
          <div className="flex flex-wrap gap-1">
            {PAYMENT_FILTERS.map((p) => {
              const isActive = p.value === (paymentFilter || "ALL");
              return (
                <Link
                  key={p.value}
                  href={buildUrl({
                    payment: p.value === "ALL" ? "" : p.value,
                    page: "1",
                  })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {p.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
                  Check-in
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Check-out
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
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    No bookings found.
                  </td>
                </tr>
              )}
              {bookings.map((booking) => {
                const lodgeNames = [
                  ...new Set(booking.legs.map((l) => l.lodge.name)),
                ].join(", ");
                const firstLeg = booking.legs[0];
                const lastLeg = booking.legs[booking.legs.length - 1];

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
                      {firstLeg ? formatDate(firstLeg.checkInDate) : "--"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {lastLeg ? formatDate(lastLeg.checkOutDate) : "--"}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
