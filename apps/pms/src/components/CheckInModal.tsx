import { useState, useCallback } from "react";
import type { RoomSlot } from "@himalayan-stays/shared";
import { checkIn } from "@/lib/rooms";
import { lookupBooking, type PlatformBookingLookup } from "@/lib/platform-api";

interface Props {
  room: RoomSlot;
  roomType: string;
  onClose: () => void;
  onDone: () => void;
}

export default function CheckInModal({ room, roomType, onClose, onDone }: Props) {
  const [guestType, setGuestType] = useState<"walkin" | "platform">("walkin");
  const [bookingRef, setBookingRef] = useState("");
  const [guestName, setGuestName] = useState("");
  const [groupSize, setGroupSize] = useState(1);
  const [expectedCheckout, setExpectedCheckout] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<PlatformBookingLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleLookup = useCallback(async () => {
    const ref = bookingRef.trim().toUpperCase();
    if (!ref) return;
    setLookupBusy(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const found = await lookupBooking(ref);
      if (!found) {
        setLookupError("No booking found with that reference.");
        return;
      }
      // Pick the leg matching this room's name (best-effort)
      const matchingLeg =
        found.legs.find((l) => l.roomName === room.room_name) ?? found.legs[0];
      setLookupResult(found);
      // Pre-fill the form
      setGuestName(found.guestName);
      setGroupSize(found.groupSize);
      setNationality(found.nationality ?? "");
      setNotes(found.specialRequests ?? "");
      setExpectedCheckout(matchingLeg?.checkOutDate ?? "");
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : "Lookup failed. Check your connection."
      );
    } finally {
      setLookupBusy(false);
    }
  }, [bookingRef, room.room_name]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!guestName.trim() || submitting) return;
      if (guestType === "platform" && !bookingRef.trim()) return;

      setSubmitting(true);
      try {
        await checkIn(
          room.room_id,
          guestName.trim(),
          groupSize,
          expectedCheckout || undefined,
          nationality || undefined,
          phone || undefined,
          notes || undefined,
          guestType === "platform" ? bookingRef.trim().toUpperCase() : undefined
        );
        onDone();
      } catch (err) {
        console.error("Check-in failed:", err);
        setSubmitting(false);
      }
    },
    [
      guestType,
      bookingRef,
      guestName,
      groupSize,
      expectedCheckout,
      nationality,
      phone,
      notes,
      room.room_id,
      submitting,
      onDone,
    ]
  );

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col">
      {/* Header */}
      <div className="bg-[var(--color-surface)] px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <button
          onClick={onClose}
          className="min-h-12 min-w-12 flex items-center justify-center text-white/60 text-lg"
        >
          ✕
        </button>
        <h2 className="text-lg font-bold">
          Check In — {room.room_name}
        </h2>
        <div className="w-12" />
      </div>

      {/* Room info */}
      <div className="px-4 py-3 bg-[var(--color-surface)]/50 border-b border-white/5">
        <span className="text-white/50 text-sm">{roomType}</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 p-4 space-y-5">
          {/* Guest Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Guest Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGuestType("walkin");
                  setLookupResult(null);
                  setLookupError(null);
                }}
                className={`min-h-14 rounded-lg border-2 px-4 text-base font-semibold transition ${
                  guestType === "walkin"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                    : "border-white/10 bg-[var(--color-surface)] text-white/60"
                }`}
              >
                Walk-in
              </button>
              <button
                type="button"
                onClick={() => setGuestType("platform")}
                className={`min-h-14 rounded-lg border-2 px-4 text-base font-semibold transition ${
                  guestType === "platform"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                    : "border-white/10 bg-[var(--color-surface)] text-white/60"
                }`}
              >
                Has booking
              </button>
            </div>
          </div>

          {/* Booking ref (platform booking) */}
          {guestType === "platform" && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Booking Reference *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bookingRef}
                  onChange={(e) => {
                    setBookingRef(e.target.value);
                    setLookupResult(null);
                    setLookupError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLookup();
                    }
                  }}
                  placeholder="HS-20260508-XXXX"
                  required
                  autoFocus
                  className="flex-1 min-h-14 px-4 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-text)] text-lg uppercase placeholder:text-white/30 placeholder:normal-case focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={!bookingRef.trim() || lookupBusy}
                  className="min-h-14 min-w-[88px] rounded-lg bg-[var(--color-primary)] px-4 text-white font-bold disabled:opacity-40"
                >
                  {lookupBusy ? "…" : "Look up"}
                </button>
              </div>
              <p className="mt-1 text-xs text-white/40">
                Tap Look up to fetch the guest&apos;s details from the platform.
              </p>

              {lookupError && (
                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
                  {lookupError}
                </div>
              )}

              {lookupResult && (
                <div className="mt-3 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 p-3 text-sm space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      {lookupResult.guestName}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${
                        lookupResult.status === "CONFIRMED"
                          ? "bg-green-500/20 text-green-300"
                          : lookupResult.status === "PENDING"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-white/10 text-white/60"
                      }`}
                    >
                      {lookupResult.status.replace("_", " ")}
                    </span>
                  </div>
                  {lookupResult.legs.map((leg, i) => (
                    <div key={i} className="text-xs text-white/70">
                      {leg.lodgeName} · {leg.roomName} · {leg.checkInDate} → {leg.checkOutDate} ({leg.nightCount}n)
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    {lookupResult.paid ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                        ✓ Paid online ({lookupResult.paymentMethod})
                      </span>
                    ) : lookupResult.cashOnArrival ? (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">
                        💵 Pay at lodge — collect on check-in
                      </span>
                    ) : (
                      <span className="rounded-full bg-stone-500/20 px-2 py-0.5 text-stone-300">
                        ⚠ No payment method
                      </span>
                    )}
                    {lookupResult.groupSize > 1 && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">
                        {lookupResult.groupSize} guests
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guest Name */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Guest Name *
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Full name"
              required
              autoFocus={guestType === "walkin"}
              className="w-full min-h-14 px-4 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-text)] text-lg placeholder:text-white/30 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Group Size */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Group Size
            </label>
            <input
              type="number"
              value={groupSize}
              onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              className="w-full min-h-14 px-4 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-text)] text-lg focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Expected Checkout */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Expected Checkout
            </label>
            <input
              type="date"
              value={expectedCheckout}
              onChange={(e) => setExpectedCheckout(e.target.value)}
              className="w-full min-h-14 px-4 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-text)] text-lg focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Nationality
            </label>
            <input
              type="text"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder="e.g. Nepali, British, American"
              className="w-full min-h-14 px-4 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-text)] text-lg placeholder:text-white/30 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+977 98XXXXXXXX"
              className="w-full min-h-14 px-4 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-text)] text-lg placeholder:text-white/30 focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border border-white/10 text-[var(--color-text)] text-base placeholder:text-white/30 focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3 border-t border-white/10 bg-[var(--color-surface)]">
          <button
            type="submit"
            disabled={!guestName.trim() || submitting}
            className="w-full min-h-14 rounded-lg bg-green-600 text-white text-lg font-bold disabled:opacity-40"
          >
            {submitting ? "Checking In..." : "Check In"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-14 rounded-lg bg-white/10 text-white/70 text-base font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
