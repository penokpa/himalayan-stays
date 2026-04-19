import { useState } from "react";

interface Props {
  onOpen: (guestName: string, roomId?: string) => void;
  onClose: () => void;
}

export default function NewTabModal({ onOpen, onClose }: Props) {
  const [guestName, setGuestName] = useState("");
  const [roomId, setRoomId] = useState("");

  const canSubmit = guestName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--color-surface)] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-6">New Tab</h2>

        <label className="block text-sm text-white/60 mb-1">Guest Name *</label>
        <input
          type="text"
          autoFocus
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Guest name"
          className="w-full min-h-[48px] px-4 rounded-lg bg-white/10 text-[var(--color-text)] placeholder-white/30 border border-white/10 focus:border-[var(--color-primary)] outline-none mb-4"
        />

        <label className="block text-sm text-white/60 mb-1">
          Room (optional)
        </label>
        <input
          type="text"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="e.g. Room 3"
          className="w-full min-h-[48px] px-4 rounded-lg bg-white/10 text-[var(--color-text)] placeholder-white/30 border border-white/10 focus:border-[var(--color-primary)] outline-none mb-6"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-lg border border-white/20 text-white/60 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (canSubmit) onOpen(guestName.trim(), roomId.trim() || undefined);
            }}
            disabled={!canSubmit}
            className="flex-1 min-h-[48px] rounded-lg bg-[var(--color-primary)] text-white font-bold disabled:opacity-40"
          >
            Open Tab
          </button>
        </div>
      </div>
    </div>
  );
}
