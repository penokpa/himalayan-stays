export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintButton from "./PrintButton";

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
          lodge: { select: { name: true, village: true, altitudeMeters: true } },
          room: { select: { name: true, roomType: true } },
        },
      },
      payments: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { method: true, providerTxnId: true, amount: true, currency: true, paidAt: true },
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

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        {/* Success Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-8 w-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-stone-900 sm:text-3xl">
            Your booking is confirmed!
          </h1>
          <p className="mt-2 text-stone-600">
            {isMultiLeg
              ? "We've reserved your rooms along the trek. Show this confirmation at each lodge."
              : "We've reserved your room. Show this confirmation at the lodge."}
          </p>
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
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-stone-900">
                            {l.lodge.name}
                          </h3>
                          <p className="text-sm text-stone-500">
                            {l.lodge.village}
                            {l.lodge.altitudeMeters &&
                              ` · ${l.lodge.altitudeMeters.toLocaleString()}m`}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-emerald-700">
                          NPR {Number(l.legTotal).toLocaleString()}
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
              <span className="text-emerald-700">
                NPR{" "}
                {Number(
                  booking.totalPriceNpr ?? leg?.legTotal ?? 0
                ).toLocaleString()}
              </span>
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

        {booking.payments.length > 0 ? (
          <div className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            <strong>Paid:</strong>{" "}
            {booking.payments[0].currency}{" "}
            {Number(booking.payments[0].amount).toLocaleString()} via{" "}
            {PAYMENT_METHOD_LABELS[booking.payments[0].method] ?? booking.payments[0].method}
            {booking.payments[0].providerTxnId && (
              <span className="ml-1 text-emerald-600">
                (Ref: {booking.payments[0].providerTxnId})
              </span>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            <strong>Payment:</strong> Pay at Lodge &mdash; No advance payment
            required. Pay directly at {isMultiLeg ? "each lodge" : "the lodge"} upon arrival.
            <div className="mt-2">
              <a
                href={`/booking/${booking.bookingRef}/pay`}
                className="font-medium text-amber-900 underline hover:no-underline"
              >
                Pay online now instead
              </a>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <PrintButton />
          <a
            href="/treks"
            className="rounded-lg border border-stone-300 bg-white px-6 py-2.5 text-center text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Explore More Treks
          </a>
        </div>
      </div>
    </main>
  );
}
