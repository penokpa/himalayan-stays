export const dynamic = "force-dynamic";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@prisma/client";

const STATUSES = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CHECKED_IN: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-orange-100 text-orange-800",
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
        Paid
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

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function OwnerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = sp.status ?? "ALL";

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <p className="text-gray-500">Not authenticated.</p>;

  const where: {
    lodge: { ownerId: string };
    status?: BookingStatus;
  } = { lodge: { ownerId: userId } };
  if (statusFilter !== "ALL") {
    where.status = statusFilter as BookingStatus;
  }

  const legs = await prisma.bookingLeg.findMany({
    where,
    orderBy: { checkInDate: "asc" },
    take: 100,
    include: {
      lodge: { select: { name: true } },
      room: { select: { name: true } },
      booking: {
        include: {
          bookedBy: { select: { name: true, email: true, phone: true } },
          payments: { select: { method: true, status: true } },
        },
      },
    },
  });

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase text-gray-500">Status:</span>
          {STATUSES.map((s) => {
            const isActive = s.value === statusFilter;
            const url =
              s.value === "ALL" ? "/owner/bookings" : `/owner/bookings?status=${s.value}`;
            return (
              <Link
                key={s.value}
                href={url}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Lodge / Room</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Check-in</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Check-out</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Payment</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {legs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                legs.map((leg) => (
                  <tr key={leg.id} id={leg.booking.bookingRef} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                      {leg.booking.bookingRef}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {leg.booking.bookedBy.name}
                      {leg.booking.bookedBy.phone && (
                        <span className="ml-1 text-xs text-gray-400">{leg.booking.bookedBy.phone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {leg.lodge.name} <span className="text-gray-400">· {leg.room.name}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(leg.checkInDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(leg.checkOutDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[leg.status] ?? "bg-gray-100 text-gray-800"}`}
                      >
                        {leg.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <PaymentBadge bookingStatus={leg.status} payments={leg.booking.payments} />
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
