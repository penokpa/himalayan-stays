"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROOM_TYPES = [
  { value: "PRIVATE_SINGLE", label: "Private Single" },
  { value: "PRIVATE_DOUBLE", label: "Private Double" },
  { value: "PRIVATE_TWIN", label: "Private Twin" },
  { value: "DORM", label: "Dormitory" },
];

export function AddRoomForm({ lodgeId }: { lodgeId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    roomType: "PRIVATE_DOUBLE",
    capacity: "2",
    basePriceNpr: "",
    floor: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const body = {
        name: form.name,
        roomType: form.roomType,
        capacity: parseInt(form.capacity, 10),
        basePriceNpr: parseFloat(form.basePriceNpr),
        floor: form.floor ? parseInt(form.floor, 10) : null,
      };

      const res = await fetch(`/api/admin/lodges/${lodgeId}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create room");
      }

      setSuccess(true);
      setForm({
        name: "",
        roomType: "PRIVATE_DOUBLE",
        capacity: "2",
        basePriceNpr: "",
        floor: "",
      });

      // Refresh the server component data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Room added successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Room Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            placeholder="e.g. Room 101"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Room Type <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.roomType}
            onChange={(e) => updateField("roomType", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            {ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Capacity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            required
            min={1}
            value={form.capacity}
            onChange={(e) => updateField("capacity", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Base Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Base Price (NPR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            required
            min={0}
            step="0.01"
            value={form.basePriceNpr}
            onChange={(e) => updateField("basePriceNpr", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            placeholder="e.g. 1500"
          />
        </div>

        {/* Floor */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Floor</label>
          <input
            type="number"
            value={form.floor}
            onChange={(e) => updateField("floor", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            placeholder="e.g. 1"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Adding..." : "Add Room"}
        </button>
      </div>
    </form>
  );
}
