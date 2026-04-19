"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Room {
  id: string;
  name: string;
  roomType: string;
  capacity: number;
  basePriceNpr: number;
}

interface LodgeInfo {
  id: string;
  name: string;
  slug: string;
  village: string;
}

import { ROOM_TYPE_LABELS } from "@/lib/booking-utils";


export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [lodge, setLodge] = useState<LodgeInfo | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/lodges/${slug}`);
        if (!res.ok) throw new Error("Lodge not found");
        const data = await res.json();
        setLodge(data.lodge);
        setRooms(data.rooms);
      } catch {
        setError("Could not load lodge details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const nightCount =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.ceil(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;
  const totalPrice =
    selectedRoom && nightCount > 0
      ? Number(selectedRoom.basePriceNpr) * nightCount
      : 0;

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lodge || !selectedRoom) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lodgeId: lodge.id,
          roomId: selectedRoomId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          groupSize: guests,
          guestName,
          guestEmail,
          specialRequests: specialRequests || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Booking failed");
      }

      const data = await res.json();
      const ref = data.booking.bookingRef;
      router.push(`/booking/${ref}/pay`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="text-stone-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <a
          href={`/lodge/${slug}`}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          &larr; Back to lodge
        </a>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Book a Room
          {lodge && (
            <span className="text-stone-500 font-normal">
              {" "}
              at {lodge.name}
            </span>
          )}
        </h1>

        <div className="mt-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          You&apos;ll choose your payment method after booking &mdash; pay
          online or at the lodge.
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Room Selection */}
          <div>
            <label
              htmlFor="room"
              className="block text-sm font-medium text-stone-700"
            >
              Room
            </label>
            <select
              id="room"
              required
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              <option value="">Select a room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}
                  , sleeps {room.capacity}) &mdash; NPR{" "}
                  {Number(room.basePriceNpr).toLocaleString()}/night
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="checkIn"
                className="block text-sm font-medium text-stone-700"
              >
                Check-in Date
              </label>
              <input
                id="checkIn"
                type="date"
                required
                min={today}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="checkOut"
                className="block text-sm font-medium text-stone-700"
              >
                Check-out Date
              </label>
              <input
                id="checkOut"
                type="date"
                required
                min={checkIn || today}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Guests */}
          <div>
            <label
              htmlFor="guests"
              className="block text-sm font-medium text-stone-700"
            >
              Number of Guests
            </label>
            <input
              id="guests"
              type="number"
              required
              min={1}
              max={selectedRoom?.capacity ?? 10}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>

          {/* Guest Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="guestName"
                className="block text-sm font-medium text-stone-700"
              >
                Guest Name
              </label>
              <input
                id="guestName"
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Full name"
                className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="guestEmail"
                className="block text-sm font-medium text-stone-700"
              >
                Guest Email
              </label>
              <input
                id="guestEmail"
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label
              htmlFor="specialRequests"
              className="block text-sm font-medium text-stone-700"
            >
              Special Requests{" "}
              <span className="text-stone-400">(optional)</span>
            </label>
            <textarea
              id="specialRequests"
              rows={3}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Dietary requirements, arrival time, etc."
              className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>

          {/* Price Summary */}
          {selectedRoom && nightCount > 0 && (
            <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-stone-200">
              <h3 className="font-semibold text-stone-900">Price Summary</h3>
              <div className="mt-3 space-y-1 text-sm text-stone-600">
                <div className="flex justify-between">
                  <span>
                    {selectedRoom.name} &times; {nightCount}{" "}
                    {nightCount === 1 ? "night" : "nights"}
                  </span>
                  <span>
                    NPR {Number(selectedRoom.basePriceNpr).toLocaleString()}{" "}
                    &times; {nightCount}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-lg font-semibold text-stone-900">
                <span>Total</span>
                <span className="text-emerald-700">
                  NPR {totalPrice.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedRoomId || nightCount <= 0}
            className="w-full rounded-lg bg-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Confirming..." : "Confirm Booking"}
          </button>
        </form>
      </div>
    </main>
  );
}
