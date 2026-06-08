export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "./PrintButton";
import CancelBookingButton from "@/components/CancelBookingButton";
import LeaveReviewButton from "@/components/LeaveReviewButton";
import ModifyDatesButton from "@/components/ModifyDatesButton";
import Money from "@/components/Money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  return { title: `Booking ${ref} | Himalayan Stays` };
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: "Credit/Debit Card (Stripe)",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "Pay at Lodge",
};

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { ref } = await params;
  const { payment } = await searchParams;

  const booking = await prisma.booking.findUnique({
    where: { bookingRef: ref },
    include: {
      bookedBy: { select: { name: true, email: true } },
      itinerary: { select: { name: true, trekRoute: true } },
      legs: {
        orderBy: { dayNumber: "asc" },
        include: {
          lodge: { select: { id: true, name: true, village: true, altitudeMeters: true } },
          room: { select: { name: true, roomType: true } },
          reviews: { select: { id: true } },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: { method: true, providerTxnId: true, amount: true, currency: true, paidAt: true, status: true },
      },
      refunds: {
        orderBy: { createdAt: "desc" },
        select: { id: true, amount: true, method: true, status: true, reason: true, createdAt: true, completedAt: true },
      },
    },
  });

  if (!booking) notFound();

  const isMultiLeg = booking.legs.length > 1;
  const leg = booking.legs[0];

  const dateFormat: Intl.DateTimeFormatOptions = {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const HEADER_STATES = {
    PENDING: {
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
      iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      title: "Booking pending payment",
      subtitle: isMultiLeg
        ? "Your rooms are held while you complete payment. Confirm by paying online or selecting Pay at Lodge."
        : "Your room is held while you complete payment. Confirm by paying online or selecting Pay at Lodge.",
    },
    CONFIRMED: {
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600",
      iconPath: "M5 13l4 4L19 7",
      title: "Your booking is confirmed!",
      subtitle: isMultiLeg
        ? "We've reserved your rooms along the trek. Show this confirmation at each lodge."
        : "We've reserved your room. Show this confirmation at the lodge.",
    },
    CHECKED_IN: {
      bgColor: "bg-sky-100",
      iconColor: "text-sky-600",
      iconPath: "M5 13l4 4L19 7",
      title: "You're checked in",
      subtitle: "Enjoy your stay at the lodge.",
    },
    COMPLETED: {
      bgColor: "bg-stone-100",
      iconColor: "text-stone-600",
      iconPath: "M5 13l4 4L19 7",
      title: "Stay completed",
      subtitle: "Thanks for trekking with Himalayan Stays.",
    },
    CANCELLED: {
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      iconPath: "M6 18L18 6M6 6l12 12",
      title: "Booking cancelled",
      subtitle: "This booking is no longer active.",
    },
    NO_SHOW: {
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      iconPath: "M6 18L18 6M6 6l12 12",
      title: "Marked as no-show",
      subtitle: "This booking was recorded as a no-show at the lodge.",
    },
  } as const;
  const header = HEADER_STATES[booking.status as keyof typeof HEADER_STATES] ?? HEADER_STATES.PENDING;

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        {/* Status Header */}
        <div className="text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${header.bgColor}`}>
            <svg
              className={`h-8 w-8 ${header.iconColor}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={header.iconPath}
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-stone-900 sm:text-3xl">
            {header.title}
          </h1>
          <p className="mt-2 text-stone-600">{header.subtitle}</p>
        </div>

        {/* Booking Reference */}
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <div className="text-center">
            <p className="text-sm font-medium text-stone-500">
              Booking Reference
            </p>
            <p className="mt-1 text-3xl font-bold tracking-wider text-emerald-700">
              {booking.bookingRef}
            </p>
            {booking.itinerary && (
              <p className="mt-1 text-sm text-stone-500">
                {booking.itinerary.name}
              </p>
            )}
          </div>

          {/* Multi-leg itinerary display */}
          {isMultiLeg ? (
            <div className="mt-6 border-t border-stone-100 pt-6">
              <h2 className="font-semibold text-stone-900">Itinerary</h2>
              <div className="mt-4 space-y-0">
                {booking.legs.map((l, i) => (
                  <div key={l.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < booking.legs.length - 1 && (
                      <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-emerald-200" />
                    )}
                    <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-stone-900">
                            {l.lodge.name}
                          </h3>
                          <p className="text-sm text-stone-500">
                            {l.lodge.village}
                            {l.lodge.altitudeMeters &&
                              ` · ${l.lodge.altitudeMeters.toLocaleString()}m`}
                          </p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-emerald-700">
                          <Money npr={Number(l.legTotal)} />
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-stone-600">
                        {new Date(l.checkInDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        &rarr;{" "}
                        {new Date(l.checkOutDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        &middot; {l.nightCount}{" "}
                        {l.nightCount === 1 ? "night" : "nights"} &middot;{" "}
                        {l.room.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            leg && (
              <div className="mt-6 border-t border-stone-100 pt-6">
                <h2 className="font-semibold text-stone-900">Stay Details</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Lodge</dt>
                    <dd className="font-medium text-stone-900">
                      {leg.lodge.name}, {leg.lodge.village}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Room</dt>
                    <dd className="font-medium text-stone-900">
                      {leg.room.name}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Check-in</dt>
                    <dd className="font-medium text-stone-900">
                      {new Date(leg.checkInDate).toLocaleDateString("en-US", dateFormat)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Check-out</dt>
                    <dd className="font-medium text-stone-900">
                      {new Date(leg.checkOutDate).toLocaleDateString("en-US", dateFormat)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Nights</dt>
                    <dd className="font-medium text-stone-900">
                      {leg.nightCount}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Guests</dt>
                    <dd className="font-medium text-stone-900">
                      {booking.groupSize}
                    </dd>
                  </div>
                </dl>
              </div>
            )
          )}

          {/* Total */}
          <div className="mt-6 border-t border-stone-100 pt-6">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-stone-900">Total</span>
              <Money
                npr={Number(booking.totalPriceNpr ?? leg?.legTotal ?? 0)}
                className="text-emerald-700"
              />
            </div>
            {isMultiLeg && (
              <p className="mt-1 text-xs text-stone-400">
                {booking.groupSize} {booking.groupSize === 1 ? "guest" : "guests"} &middot;{" "}
                {booking.legs.length} lodges &middot;{" "}
                {booking.legs.reduce((sum, l) => sum + l.nightCount, 0)} nights total
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-stone-100 pt-6">
            <h2 className="font-semibold text-stone-900">Guest Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">Name</dt>
                <dd className="font-medium text-stone-900">
                  {booking.bookedBy.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">Email</dt>
                <dd className="font-medium text-stone-900">
                  {booking.bookedBy.email}
                </dd>
              </div>
            </dl>
          </div>

          {booking.specialRequests && (
            <div className="mt-6 border-t border-stone-100 pt-6">
              <h2 className="font-semibold text-stone-900">
                Special Requests
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                {booking.specialRequests}
              </p>
            </div>
          )}
        </div>

        {/* Payment Status */}
        {payment === "success" && (
          <div className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            <strong>Payment received!</strong> Your booking is confirmed.
          </div>
        )}

        {(() => {
          const completedPayment = booking.payments.find(
            (p) => p.status === "COMPLETED"
          );
          const cashPayment = booking.payments.find(
            (p) => p.method === "CASH" && p.status === "INITIATED"
          );

          if (completedPayment) {
            return (
              <div className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
                <strong>Paid:</strong> {completedPayment.currency}{" "}
                {Number(completedPayment.amount).toLocaleString()} via{" "}
                {PAYMENT_METHOD_LABELS[completedPayment.method] ?? completedPayment.method}
                {completedPayment.providerTxnId && (
                  <span className="ml-1 text-emerald-600">
                    (Ref: {completedPayment.providerTxnId})
                  </span>
                )}
              </div>
            );
          }

          if (booking.status === "CONFIRMED" && cashPayment) {
            return (
              <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                <strong>Payment:</strong> Pay at Lodge &mdash; No advance payment
                required. Pay directly at {isMultiLeg ? "each lodge" : "the lodge"} upon arrival.
                <div className="mt-2">
                  <a
                    href={`/booking/${booking.bookingRef}/pay`}
                    className="font-medium text-amber-900 underline hover:no-underline"
                  >
                    Switch to online payment
                  </a>
                </div>
              </div>
            );
          }

          if (booking.status === "PENDING") {
            return (
              <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-300">
                <strong>Action needed:</strong> No payment method selected yet.
                Choose how you&apos;d like to pay to confirm{" "}
                {isMultiLeg ? "your trek" : "your stay"}.
                <div className="mt-3">
                  <a
                    href={`/booking/${booking.bookingRef}/pay`}
                    className="inline-block rounded-md bg-amber-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
                  >
                    Choose payment method →
                  </a>
                </div>
              </div>
            );
          }

          return null;
        })()}

        {/* Refunds */}
        {booking.refunds.length > 0 && (() => {
          const totalRefunded = booking.refunds
            .filter((r) => r.status === "COMPLETED")
            .reduce((s, r) => s + Number(r.amount), 0);
          const pending = booking.refunds.filter(
            (r) => r.status === "MANUAL_PENDING" || r.status === "INITIATED"
          );
          const pendingTotal = pending.reduce((s, r) => s + Number(r.amount), 0);
          return (
            <div className="mt-6 rounded-lg bg-stone-50 p-4 text-sm ring-1 ring-stone-200">
              <p className="font-semibold text-stone-900">
                Refunds
              </p>
              {totalRefunded > 0 && (
                <p className="mt-1 text-emerald-700">
                  ✓ NPR {totalRefunded.toLocaleString()} refunded
                </p>
              )}
              {pendingTotal > 0 && (
                <p className="mt-1 text-amber-700">
                  ⏳ NPR {pendingTotal.toLocaleString()} refund pending
                  {pending.some((r) => r.method !== "STRIPE" && r.method !== "CASH") &&
                    " — your eSewa/Khalti refund may take 3–7 business days"}
                </p>
              )}
              <ul className="mt-3 space-y-2 text-xs text-stone-600">
                {booking.refunds.map((r) => (
                  <li key={r.id} className="flex items-baseline justify-between gap-3">
                    <span>
                      <span className="font-medium text-stone-700">
                        NPR {Number(r.amount).toLocaleString()}
                      </span>
                      {" via "}
                      {r.method}
                      {r.reason && (
                        <span className="text-stone-500"> — {r.reason}</span>
                      )}
                    </span>
                    <span
                      className={
                        r.status === "COMPLETED"
                          ? "text-emerald-700"
                          : r.status === "FAILED"
                          ? "text-red-700"
                          : "text-amber-700"
                      }
                    >
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Reviews — only for stays already underway or finished */}
        {(booking.status === "CHECKED_IN" || booking.status === "COMPLETED") && (
          <div className="mt-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
            <h2 className="font-semibold text-stone-900">Share your experience</h2>
            <p className="mt-1 text-sm text-stone-500">
              {isMultiLeg
                ? "Leave a review for each lodge you stayed at."
                : "Help future trekkers — leave a review."}
            </p>
            <div className="mt-4 space-y-3">
              {booking.legs.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-100 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">{l.lodge.name}</p>
                    <p className="text-xs text-stone-500">{l.lodge.village}</p>
                  </div>
                  <LeaveReviewButton
                    bookingRef={booking.bookingRef}
                    lodgeId={l.lodge.id}
                    lodgeName={l.lodge.name}
                    defaultEmail={booking.bookedBy.email ?? undefined}
                    alreadyReviewed={l.reviews.length > 0}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <PrintButton bookingRef={booking.bookingRef} />
          <a
            href={`/api/bookings/${booking.bookingRef}/ics`}
            className="rounded-lg border border-stone-300 bg-white px-6 py-2.5 text-center text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            📅 Add to Calendar
          </a>
          <a
            href="/treks"
            className="rounded-lg border border-stone-300 bg-white px-6 py-2.5 text-center text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Explore More Treks
          </a>
        </div>

        {/* Modify / Cancel — only allowed for PENDING/CONFIRMED with future check-in */}
        {(booking.status === "PENDING" || booking.status === "CONFIRMED") &&
          leg &&
          new Date(leg.checkInDate).getTime() > Date.now() && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <ModifyDatesButton
                bookingRef={booking.bookingRef}
                defaultEmail={booking.bookedBy.email ?? undefined}
                currentStartDate={leg.checkInDate}
                size="sm"
              />
              <CancelBookingButton
                bookingRef={booking.bookingRef}
                defaultEmail={booking.bookedBy.email ?? undefined}
                variant="link"
              />
            </div>
          )}
      </div>
    </main>
  );
}
