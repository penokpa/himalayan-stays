"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Room {
  id: string;
  name: string;
  roomType: string;
  capacity: number;
  basePriceNpr: string | number;
  floor: number | null;
  isActive: boolean;
}

const ROOM_TYPES = [
  { value: "PRIVATE_SINGLE", label: "Private Single" },
  { value: "PRIVATE_DOUBLE", label: "Private Double" },
  { value: "PRIVATE_TWIN", label: "Private Twin" },
  { value: "DORM", label: "Dormitory" },
];

export default function RoomEditDialog({ room }: { room: Room }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(room.name);
  const [roomType, setRoomType] = useState(room.roomType);
  const [capacity, setCapacity] = useState(String(room.capacity));
  const [price, setPrice] = useState(String(room.basePriceNpr));
  const [floor, setFloor] = useState(room.floor?.toString() ?? "");
  const [isActive, setIsActive] = useState(room.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          roomType,
          capacity,
          basePriceNpr: price,
          floor: floor === "" ? null : floor,
          isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Save failed");
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
      >
        Edit
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl dark:bg-stone-900 dark:ring-1 dark:ring-stone-800"
      >
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-stone-100">Edit room</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Close
          </button>
        </div>

        <Field label="Name">
          <input
            required
            type="text"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className={cls}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Capacity">
            <input
              required
              type="number"
              min={1}
              max={50}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className={cls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Base price (NPR/night)">
            <input
              required
              type="number"
              min={0}
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={cls}
            />
          </Field>
          <Field label="Floor (optional)">
            <input
              type="number"
              min={-2}
              max={20}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className={cls}
            />
          </Field>
        </div>

        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700 dark:text-stone-300">
            Active{" "}
            <span className="text-xs text-gray-400 dark:text-stone-500">
              (inactive rooms aren&apos;t bookable)
            </span>
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

const cls =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder-stone-500 dark:[color-scheme:dark]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">{label}</span>
      {children}
    </label>
  );
}
