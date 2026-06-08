export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CancelBookingButton from "@/components/CancelBookingButton";
import LeaveReviewButton from "@/components/LeaveReviewButton";
import ModifyDatesButton from "@/components/ModifyDatesButton";
import Money from "@/components/Money";

export const metadata = {
  title: "My Bookings | Himalayan Stays",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "bg-amber-50 text-amber-700 ring-amber-200" },
  CONFIRMED: { label: "Confirmed", color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CHECKED_IN: { label: "Checked in", color: "bg-sky-50 text-sky-700 ring-sky-200" },
  COMPLETED: { label: "Completed", color: "bg-stone-100 text-stone-700 ring-stone-200" },
  CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-700 ring-red-200" },
  NO_SHOW: { label: "No-show", color: "bg-red-50 text-red-700 ring-red-200" },
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const trimmed = email?.trim().toLowerCase();

  const bookings = trimmed
    ? await prisma.booking.findMany({
        where: { bookedBy: { email: trimmed } },
        orderBy: { createdAt: "desc" },
        include: {
          itinerary: { select: { name: true } },
          legs: {
            orderBy: { dayNumber: "asc" },
            include: {
              lodge: { select: { id: true, name: true, village: true } },
              reviews: { select: { id: true } },
            },
          },
          payments: {
            select: { method: true, status: true },
          },
          refunds: {
            select: { amount: true, status: true },
          },
        },
      })
    : null;

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Find My Bookings
        </h1>
        <p className="mt-2 text-stone-600">
          Enter the email address you used at checkout to see your bookings.
        </p>

        {/* Lookup form */}
        <form
          method="GET"
          className="mt-6 flex flex-col gap-2 sm:flex-row"
        >
          <input
            name="email"
            type="email"
            required
            defaultValue={trimmed ?? ""}
            placeholder="you@example.com"
            className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-6 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Find bookings
          </button>
        </form>

        {/* Results */}
        {bookings === null ? null : bookings.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-stone-300 p-8 text-center">
            <p className="text-stone-600">
              No bookings found for{" "}
              <span className="font-semibold text-stone-900">{trimmed}</span>.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Double-check the email or{" "}
              <Link href="/treks" className="font-medium text-emerald-700 hover:underline">
                start a new booking
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-stone-500">
              Found {bookings.length}{" "}
              {bookings.length === 1 ? "booking" : "bookings"} for {trimmed}.
            </p>
            {bookings.map((b) => {
              const status = STATUS_LABELS[b.status] ?? {
                label: b.status,
                color: "bg-stone-100 text-stone-700 ring-stone-200",
              };
              const firstLeg = b.legs[0];
              const lastLeg = b.legs[b.legs.length - 1];
              const isMulti = b.legs.length > 1;
              const canCancel =
                (b.status === "PENDING" || b.status === "CONFIRMED") &&
                firstLeg &&
                new Date(firstLeg.checkInDate).getTime() > Date.now();

              return (
                <div
                  key={b.id}
                  className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200 transition hover:ring-2 hover:ring-emerald-500"
                >
                  <Link
                    href={`/booking/${b.bookingRef}/confirmation`}
                    className="block"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-stone-500">
                          {b.bookingRef}
                        </p>
                        <h2 className="mt-0.5 font-semibold text-stone-900">
                          {b.itinerary?.name ??
                            (isMulti
                              ? `${b.legs.length}-stop trek`
                              : firstLeg?.lodge.name ?? "Booking")}
                        </h2>
                        {firstLeg && lastLeg && (
                          <p className="mt-1 text-sm text-stone-600">
                            {formatDate(firstLeg.checkInDate)}
                            {isMulti && ` → ${formatDate(lastLeg.checkOutDate)}`}
                            {!isMulti && ` → ${formatDate(firstLeg.checkOutDate)}`}
                            {isMulti && (
                              <span className="text-stone-400">
                                {" · "}
                                {firstLeg.lodge.village} → {lastLeg.lodge.village}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${status.color}`}
                        >
                          {status.label}
                        </span>
                        <Money
                          npr={Number(b.totalPriceNpr ?? 0)}
                          className="whitespace-nowrap text-sm font-semibold text-emerald-700"
                        />
                      </div>
                    </div>
                    {(() => {
                      const refundedTotal = b.refunds
                        .filter((r) => r.status === "COMPLETED")
                        .reduce((s, r) => s + Number(r.amount), 0);
                      const refundPendingTotal = b.refunds
                        .filter((r) => r.status === "MANUAL_PENDING" || r.status === "INITIATED")
                        .reduce((s, r) => s + Number(r.amount), 0);
                      if (refundedTotal > 0 && refundPendingTotal === 0) {
                        return (
                          <p className="mt-3 text-xs text-emerald-700">
                            ↩ NPR {refundedTotal.toLocaleString()} refunded
                          </p>
                        );
                      }
                      if (refundPendingTotal > 0) {
                        return (
                          <p className="mt-3 text-xs text-amber-700">
                            ↩ NPR {refundPendingTotal.toLocaleString()} refund pending
                          </p>
                        );
                      }
                      const hasCompleted = b.payments.some((p) => p.status === "COMPLETED");
                      const hasCashHold = b.payments.some(
                        (p) => p.method === "CASH" && p.status === "INITIATED"
                      );
                      if (hasCompleted) {
                        return <p className="mt-3 text-xs text-emerald-700">✓ Payment received</p>;
                      }
                      if (b.status === "CONFIRMED" && hasCashHold) {
                        return (
                          <p className="mt-3 text-xs text-stone-500">
                            🏠 Pay at Lodge — settle on arrival
                          </p>
                        );
                      }
                      if (b.status === "PENDING") {
                        return (
                          <p className="mt-3 text-xs text-amber-700">
                            ⚠ No payment method selected —{" "}
                            <span className="font-semibold">complete it</span> to confirm your stay
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </Link>
                  {canCancel && firstLeg && (
                    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-3">
                      <ModifyDatesButton
                        bookingRef={b.bookingRef}
                        defaultEmail={trimmed}
                        currentStartDate={firstLeg.checkInDate}
                        size="sm"
                      />
                      <CancelBookingButton
                        bookingRef={b.bookingRef}
                        defaultEmail={trimmed}
                        size="sm"
                      />
                    </div>
                  )}
                  {(b.status === "CHECKED_IN" || b.status === "COMPLETED") && (
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 pt-3">
                      {b.legs.map((l) => (
                        <LeaveReviewButton
                          key={l.id}
                          bookingRef={b.bookingRef}
                          lodgeId={l.lodge.id}
                          lodgeName={l.lodge.name}
                          defaultEmail={trimmed}
                          alreadyReviewed={l.reviews.length > 0}
                          size="sm"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-xs text-stone-400">
          Lost your booking? Try a different email or contact{" "}
          <a
            href="mailto:bookings@himalayanstays.com"
            className="text-emerald-700 hover:underline"
          >
            bookings@himalayanstays.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
