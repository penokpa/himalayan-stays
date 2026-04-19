import { useState, useCallback } from "react";
import { initializeRooms } from "@/lib/rooms";

const ROOM_TYPES = ["Private Single", "Private Double", "Private Twin", "Dorm"];

interface RoomEntry {
  name: string;
  type: string;
}

interface Props {
  onDone: () => void;
}

export default function RoomSetup({ onDone }: Props) {
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState(ROOM_TYPES[0]);
  const [saving, setSaving] = useState(false);

  const addRoom = useCallback(() => {
    if (!name.trim()) return;
    setRooms((prev) => [...prev, { name: name.trim(), type }]);
    setName("");
  }, [name, type]);

  const removeRoom = useCallback((idx: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(async () => {
    if (rooms.length === 0 || saving) return;
    setSaving(true);
    try {
      await initializeRooms(rooms);
      onDone();
    } catch (err) {
      console.error("Setup failed:", err);
      setSaving(false);
    }
  }, [rooms, saving, onDone]);

  return (
    <div className="space-y-6">
      <div className="text-center pt-6 pb-2">
        <h2 className="text-2xl font-bold">Room Setup</h2>
        <p className="text-white/50 mt-2 text-sm">
          Add your rooms to get started
        </p>
      </div>

      {/* Add room form */}
      <div className="bg-[var(--color-surface)] rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Room Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Room 1, Dorm A"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRoom();
              }
            }}
            className="w-full min-h-14 px-4 rounded-lg bg-[var(--color-bg)] border border-white/10 text-[var(--color-text)] text-lg placeholder:text-white/30 focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Room Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full min-h-14 px-4 rounded-lg bg-[var(--color-bg)] border border-white/10 text-[var(--color-text)] text-lg focus:outline-none focus:border-[var(--color-primary)] appearance-none"
          >
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={addRoom}
          disabled={!name.trim()}
          className="w-full min-h-14 rounded-lg bg-[var(--color-primary)] text-white text-base font-bold disabled:opacity-40"
        >
          Add Room
        </button>
      </div>

      {/* Room list */}
      {rooms.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-white/50 uppercase tracking-wide px-1">
            Rooms ({rooms.length})
          </h3>
          {rooms.map((r, i) => (
            <div
              key={i}
              className="bg-[var(--color-surface)] rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div>
                <span className="text-base font-semibold">{r.name}</span>
                <span className="text-white/40 text-sm ml-2">{r.type}</span>
              </div>
              <button
                onClick={() => removeRoom(i)}
                className="min-h-12 min-w-12 flex items-center justify-center text-red-400 text-lg"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Save */}
      {rooms.length > 0 && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full min-h-14 rounded-lg bg-green-600 text-white text-lg font-bold disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save & Start"}
        </button>
      )}
    </div>
  );
}
