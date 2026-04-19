"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useItineraryBuilder } from "../context";
import { ROOM_TYPE_LABELS, calculateCheckInDate, calculateCheckOutDate } from "@/lib/booking-utils";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ReviewPage() {
  const { route } = useParams<{ route: string }>();
  const router = useRouter();
  const ctx = useItineraryBuilder();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDate = ctx.startDate ? new Date(ctx.startDate) : null;

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trekRoute: ctx.trekRoute,
          itineraryName: ctx.itineraryName,
          startDate: ctx.startDate,
          groupSize: ctx.traveler.groupSize,
          guestName: ctx.traveler.name,
          guestEmail: ctx.traveler.email,
          specialRequests: ctx.traveler.specialRequests || undefined,
          stops: ctx.stops.map((s) => ({
            lodgeId: s.lodgeId,
            roomId: s.roomId,
            dayNumber: s.dayNumber,
            nights: s.nights,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.unavailableStops) {
          const stopNames = data.unavailableStops
            .map((day: number) => {
              const stop = ctx.stops.find((s) => s.dayNumber === day);
              return stop ? `${stop.lodgeName} (Day ${day})` : `Day ${day}`;
            })
            .join(", ");
          throw new Error(`Rooms no longer available at: ${stopNames}. Please go back and select different rooms.`);
        }
        throw new Error(data.error || "Booking failed");
      }

      const data = await res.json();
      const ref = data.booking.bookingRef;
      ctx.reset();
      router.push(`/booking/${ref}/pay`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500">
        Review your itinerary and confirm your booking.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Itinerary Timeline */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <h2 className="font-semibold text-stone-900">{ctx.itineraryName}</h2>
        <p className="mt-0.5 text-sm text-stone-500">
          {ctx.trekRouteName} &middot; Starting{" "}
          {startDate ? formatDate(startDate) : ctx.startDate}
        </p>

        <div className="mt-5 space-y-0">
          {ctx.stops.map((stop, i) => {
            const checkIn = startDate
              ? calculateCheckInDate(startDate, stop.dayNumber)
              : null;
            const checkOut = checkIn
              ? calculateCheckOutDate(checkIn, stop.nights)
              : null;
            const legTotal = stop.pricePerNight * stop.nights;

            return (
              <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Timeline line */}
                {i < ctx.stops.length - 1 && (
                  <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-emerald-200" />
                )}
                {/* Dot */}
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                  {i + 1}
                </div>
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-stone-900">{stop.lodgeName}</h3>
                      <p className="text-sm text-stone-500">
                        {stop.lodgeVillage}
                        {stop.lodgeAltitude &&
                          ` · ${stop.lodgeAltitude.toLocaleString()}m`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">
                      NPR {legTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-stone-600">
                    {checkIn && checkOut && (
                      <span>
                        {formatDate(checkIn)} &rarr; {formatDate(checkOut)} &middot;{" "}
                      </span>
                    )}
                    {stop.nights} {stop.nights === 1 ? "night" : "nights"} &middot;{" "}
                    {stop.roomName} ({ROOM_TYPE_LABELS[stop.roomType] ?? stop.roomType})
                    &middot; NPR {stop.pricePerNight.toLocaleString()}/night
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Traveler Details */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <h2 className="font-semibold text-stone-900">Traveler Details</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">Name</dt>
            <dd className="font-medium text-stone-900">{ctx.traveler.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Email</dt>
            <dd className="font-medium text-stone-900">{ctx.traveler.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Group Size</dt>
            <dd className="font-medium text-stone-900">{ctx.traveler.groupSize}</dd>
          </div>
          {ctx.traveler.specialRequests && (
            <div className="flex justify-between">
              <dt className="text-stone-500">Special Requests</dt>
              <dd className="font-medium text-stone-900 text-right max-w-xs">
                {ctx.traveler.specialRequests}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Price Summary */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
        <h2 className="font-semibold text-stone-900">Price Breakdown</h2>
        <div className="mt-3 space-y-1 text-sm text-stone-600">
          {ctx.stops.map((stop, i) => (
            <div key={i} className="flex justify-between">
              <span>
                {stop.lodgeName} &times; {stop.nights}{" "}
                {stop.nights === 1 ? "night" : "nights"}
              </span>
              <span>NPR {(stop.pricePerNight * stop.nights).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-lg font-semibold">
          <span className="text-stone-900">Total</span>
          <span className="text-emerald-700">
            NPR {ctx.grandTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Payment info */}
      <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
        You&apos;ll choose your payment method on the next step &mdash; pay
        online (Stripe, eSewa, Khalti) or at the lodge.
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push(`/treks/${route}/book/details`)}
          className="rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Back
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleConfirm}
          className="flex-1 rounded-lg bg-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Confirming..." : "Confirm Booking"}
        </button>
      </div>
    </div>
  );
}
