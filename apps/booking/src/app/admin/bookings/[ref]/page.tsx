export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { BookingStatus } from "@prisma/client";
import { StatusActions, MarkCashPaidButton } from "./actions";
import RefundDialog from "@/components/RefundDialog";
import MarkRefundCompleteButton from "@/components/MarkRefundCompleteButton";

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CHECKED_IN: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-800",
  CANCELLED: "bg-red-100 text-red-800",
  NO_SHOW: "bg-orange-100 text-orange-800",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: "Stripe (Card)",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  INITIATED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-600",
};

function formatCurrency(value: Decimal | number | null | undefined, currency = "NPR"): string {
  if (value === null || value === undefined) return "--";
  return `${currency} ${Number(value).toLocaleString()}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;

  const booking = await prisma.booking.findUnique({
    where: { bookingRef: ref },
    include: {
      bookedBy: { select: { name: true, email: true, phone: true, nationality: true } },
      itinerary: { select: { name: true, trekRoute: true, totalDays: true } },
      legs: {
        orderBy: [{ dayNumber: "asc" }, { checkInDate: "asc" }],
        include: {
          lodge: { select: { name: true, village: true, slug: true } },
          room: { select: { name: true, roomType: true } },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
      refunds: {
        orderBy: { createdAt: "desc" },
        include: { initiatedBy: { select: { name: true, email: true } } },
      },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, email: true } } },
      },
    },
  });

  if (!booking) notFound();

  const allowedTransitions = ALLOWED_TRANSITIONS[booking.status] ?? [];
  const cashHold = booking.payments.find(
    (p) => p.method === "CASH" && p.status === "INITIATED"
  );

  // Refunds — pick the primary payment to refund against
  const completedPayment = booking.payments.find((p) => p.status === "COMPLETED");
  const refundablePayment = completedPayment ?? cashHold;
  const totalRefundable = Number(refundablePayment?.amount ?? 0);
  const totalRefunded = booking.refunds
    .filter((r) => r.status === "COMPLETED" || r.status === "MANUAL_PENDING" || r.status === "INITIATED")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const remainingNpr = Math.max(0, totalRefundable - totalRefunded);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          href="/admin/bookings"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Bookings
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold text-gray-900">
          {booking.bookingRef}
        </h1>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-800"}`}
        >
          {booking.status.replace("_", " ")}
        </span>
        {booking.itinerary && (
          <span className="text-sm text-gray-500">
            {booking.itinerary.name} · {booking.itinerary.trekRoute}
          </span>
        )}
      </div>

      {/* Status actions */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Status Actions</h2>
        <div className="mt-3">
          <StatusActions
            bookingRef={booking.bookingRef}
            allowedTransitions={allowedTransitions}
          />
        </div>
      </div>

      {/* Guest */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Guest</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-gray-500">Name</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{booking.bookedBy.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Email</dt>
            <dd className="mt-0.5 break-all text-sm text-gray-900">{booking.bookedBy.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Phone</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{booking.bookedBy.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Nationality</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {booking.bookedBy.nationality ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Group Size</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{booking.groupSize}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Booking Type</dt>
            <dd className="mt-0.5 text-sm text-gray-900 capitalize">
              {booking.bookingType.toLowerCase()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Created</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {formatDateTime(booking.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Last updated</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {formatDateTime(booking.updatedAt)}
            </dd>
          </div>
        </dl>
        {booking.specialRequests && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <dt className="text-xs font-medium text-gray-500">Special Requests</dt>
            <dd className="mt-1 text-sm text-gray-900">{booking.specialRequests}</dd>
          </div>
        )}
      </div>

      {/* Legs */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          {booking.legs.length === 1 ? "Stay" : `${booking.legs.length} Lodges`}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {booking.legs.length > 1 && (
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                )}
                <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Lodge</th>
                <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
                <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Nights</th>
                <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {booking.legs.map((leg) => (
                <tr key={leg.id}>
                  {booking.legs.length > 1 && (
                    <td className="py-2 text-sm text-gray-700">{leg.dayNumber ?? "—"}</td>
                  )}
                  <td className="py-2 text-sm font-medium text-gray-900">
                    <Link
                      href={`/lodge/${leg.lodge.slug}`}
                      className="text-indigo-600 hover:underline"
                      target="_blank"
                    >
                      {leg.lodge.name}
                    </Link>
                    <span className="ml-1 text-xs text-gray-500">({leg.lodge.village})</span>
                  </td>
                  <td className="py-2 text-sm text-gray-700">{leg.room.name}</td>
                  <td className="py-2 text-sm text-gray-700">{formatDate(leg.checkInDate)}</td>
                  <td className="py-2 text-sm text-gray-700">{formatDate(leg.checkOutDate)}</td>
                  <td className="py-2 text-right text-sm text-gray-700">{leg.nightCount}</td>
                  <td className="py-2 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(leg.legTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td
                  className="py-2 text-right text-sm font-bold text-gray-900"
                  colSpan={booking.legs.length > 1 ? 6 : 5}
                >
                  Total
                </td>
                <td className="py-2 text-right text-sm font-bold text-emerald-700">
                  {formatCurrency(booking.totalPriceNpr)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payments */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Payments ({booking.payments.length})
          </h2>
          {cashHold && (
            <MarkCashPaidButton bookingRef={booking.bookingRef} />
          )}
        </div>
        {booking.payments.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 italic">
            No payment records yet — guest hasn&apos;t selected a payment method.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Provider Ref</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {booking.payments.map((pmt) => (
                  <tr key={pmt.id}>
                    <td className="py-2 text-sm font-medium text-gray-900">
                      {PAYMENT_METHOD_LABELS[pmt.method] ?? pmt.method}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[pmt.status] ?? "bg-gray-100 text-gray-700"}`}
                      >
                        {pmt.status}
                      </span>
                    </td>
                    <td className="py-2 text-right text-sm text-gray-900">
                      {formatCurrency(pmt.amount, pmt.currency)}
                    </td>
                    <td className="py-2 font-mono text-xs text-gray-500">
                      {pmt.providerTxnId ?? "—"}
                    </td>
                    <td className="py-2 text-sm text-gray-500">
                      {formatDateTime(pmt.createdAt)}
                    </td>
                    <td className="py-2 text-sm text-gray-500">
                      {pmt.paidAt ? formatDateTime(pmt.paidAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refunds */}
      {(refundablePayment || booking.refunds.length > 0) && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Refunds ({booking.refunds.length})
              </h2>
              {refundablePayment && (
                <p className="mt-1 text-xs text-gray-500">
                  Up to NPR {remainingNpr.toLocaleString()} refundable
                  {totalRefunded > 0 && ` · NPR ${totalRefunded.toLocaleString()} already issued`}
                </p>
              )}
            </div>
            {refundablePayment && (
              <RefundDialog
                bookingRef={booking.bookingRef}
                remainingNpr={remainingNpr}
                primaryMethod={refundablePayment.method}
              />
            )}
          </div>
          {booking.refunds.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Provider Ref</th>
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {booking.refunds.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 text-sm font-medium text-gray-900">{r.method}</td>
                      <td className="py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "FAILED"
                              ? "bg-red-100 text-red-800"
                              : r.status === "MANUAL_PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 text-right text-sm text-gray-900">
                        NPR {Number(r.amount).toLocaleString()}
                      </td>
                      <td className="py-2 text-sm text-gray-600">{r.reason ?? "—"}</td>
                      <td className="py-2 font-mono text-xs text-gray-500">
                        {r.providerRefundId ?? "—"}
                      </td>
                      <td className="py-2 text-sm text-gray-600">
                        {r.initiatedBy?.name ?? r.initiatedBy?.email ?? "—"}
                      </td>
                      <td className="py-2 text-sm text-gray-500">
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className="py-2 text-sm">
                        {(r.status === "MANUAL_PENDING" || r.status === "INITIATED") && (
                          <MarkRefundCompleteButton
                            bookingRef={booking.bookingRef}
                            refundId={r.id}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit timeline */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Activity ({booking.events.length})
        </h2>
        {booking.events.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 italic">
            No events recorded for this booking.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {booking.events.map((ev) => (
              <li key={ev.id} className="flex gap-3">
                <EventIcon type={ev.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-gray-900">
                      {EVENT_LABEL[ev.type] ?? ev.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(ev.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    by{" "}
                    <span className="font-medium text-gray-700">
                      {ev.actor?.name ?? ev.actorEmail ?? "system"}
                    </span>
                    {ev.actorRole && (
                      <span className="text-gray-400"> · {ev.actorRole.toLowerCase()}</span>
                    )}
                  </p>
                  {ev.metadata && Object.keys(ev.metadata as object).length > 0 && (
                    <pre className="mt-1 overflow-x-auto rounded bg-gray-50 px-2 py-1 text-xs text-gray-600 font-mono whitespace-pre-wrap">
                      {JSON.stringify(ev.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

const EVENT_LABEL: Record<string, string> = {
  booking_created: "Booking created",
  status_changed: "Status changed",
  payment_initiated: "Payment initiated",
  payment_completed: "Payment completed",
  payment_failed: "Payment failed",
  cash_held: "Pay-at-Lodge selected",
  cash_collected: "Cash collected",
  dates_modified: "Dates shifted",
  cancelled: "Booking cancelled",
};

const EVENT_DOT_COLOR: Record<string, string> = {
  booking_created: "bg-blue-500",
  status_changed: "bg-indigo-500",
  payment_completed: "bg-emerald-500",
  payment_failed: "bg-red-500",
  payment_initiated: "bg-amber-500",
  cash_held: "bg-amber-500",
  cash_collected: "bg-emerald-500",
  dates_modified: "bg-violet-500",
  cancelled: "bg-red-500",
};

function EventIcon({ type }: { type: string }) {
  const color = EVENT_DOT_COLOR[type] ?? "bg-gray-400";
  return (
    <span
      className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
      aria-hidden
    />
  );
}
