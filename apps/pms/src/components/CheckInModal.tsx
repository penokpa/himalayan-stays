import { useState, useCallback } from "react";
import type { RoomSlot } from "@himalayan-stays/shared";
import { checkIn } from "@/lib/rooms";

interface Props {
  room: RoomSlot;
  roomType: string;
  onClose: () => void;
  onDone: () => void;
}

export default function CheckInModal({ room, roomType, onClose, onDone }: Props) {
  const [guestName, setGuestName] = useState("");
  const [groupSize, setGroupSize] = useState(1);
  const [expectedCheckout, setExpectedCheckout] = useState("");
  const [nationality, setNationality] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!guestName.trim() || submitting) return;

      setSubmitting(true);
      try {
        await checkIn(
          room.room_id,
          guestName.trim(),
          groupSize,
          expectedCheckout || undefined,
          nationality || undefined,
          undefined, // phone
          notes || undefined
        );
        onDone();
      } catch (err) {
        console.error("Check-in failed:", err);
        setSubmitting(false);
      }
    },
    [guestName, groupSize, expectedCheckout, nationality, notes, room.room_id, submitting, onDone]
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
              autoFocus
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
