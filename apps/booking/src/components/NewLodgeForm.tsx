"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TREK_ROUTES = [
  { value: "EBC", label: "Everest Base Camp" },
  { value: "ABC", label: "Annapurna Base Camp" },
  { value: "LANGTANG", label: "Langtang" },
  { value: "MANASLU", label: "Manaslu" },
  { value: "UPPER_MUSTANG", label: "Upper Mustang" },
];

const AMENITY_OPTIONS: { key: string; label: string; icon: string }[] = [
  { key: "wifi", label: "Wi-Fi", icon: "📶" },
  { key: "hotShower", label: "Hot shower", icon: "🚿" },
  { key: "charging", label: "Charging", icon: "🔌" },
  { key: "restaurant", label: "Restaurant", icon: "🍽️" },
  { key: "bakery", label: "Bakery", icon: "🥐" },
  { key: "heater", label: "Heater", icon: "🔥" },
  { key: "oxygenAvailable", label: "Oxygen available", icon: "🫁" },
  { key: "garden", label: "Garden", icon: "🌿" },
  { key: "library", label: "Library", icon: "📚" },
  { key: "bar", label: "Bar", icon: "🍻" },
];

export default function NewLodgeForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trekRoute, setTrekRoute] = useState("EBC");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [altitude, setAltitude] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [amenities, setAmenities] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAmenity(key: string) {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/lodges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          trekRoute,
          village,
          district,
          altitudeMeters: altitude === "" ? null : altitude,
          latitude: lat === "" ? null : lat,
          longitude: lng === "" ? null : lng,
          amenities,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to create lodge");
      } else {
        router.push(`/owner/lodges/${data.lodge.id}`);
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <Field label="Lodge name" required>
        <input
          required
          type="text"
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sherpa Mountain Lodge"
          className={cls}
        />
      </Field>

      <Field label="Description">
        <textarea
          rows={3}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes your lodge special — views, food, owner's story…"
          className={cls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Trek route" required>
          <select
            required
            value={trekRoute}
            onChange={(e) => setTrekRoute(e.target.value)}
            className={cls}
          >
            {TREK_ROUTES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Village" required>
          <input
            required
            type="text"
            maxLength={80}
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            placeholder="e.g. Namche Bazaar"
            className={cls}
          />
        </Field>
        <Field label="District" required>
          <input
            required
            type="text"
            maxLength={80}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="e.g. Solukhumbu"
            className={cls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Altitude (m)" hint="0–9000">
          <input
            type="number"
            min={0}
            max={9000}
            value={altitude}
            onChange={(e) => setAltitude(e.target.value)}
            placeholder="e.g. 3440"
            className={cls}
          />
        </Field>
        <Field label="Latitude" hint="Optional, decimal degrees">
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="27.8064"
            className={cls}
          />
        </Field>
        <Field label="Longitude" hint="Optional, decimal degrees">
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="86.7136"
            className={cls}
          />
        </Field>
      </div>

      <div>
        <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">
          Amenities
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => {
            const on = !!amenities[a.key];
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => toggleAmenity(a.key)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
                  on
                    ? "bg-emerald-600 text-white"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                <span>{a.icon}</span>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
        Your lodge will start <strong>hidden</strong> from trekkers. After you add rooms and
        photos on the next page, toggle <strong>Active</strong> in the Lodge details form to publish.
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !name || !village || !district}
          className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create lodge"}
        </button>
      </div>
    </form>
  );
}

const cls =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder-stone-500 dark:[color-scheme:dark]";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">
          {hint}
        </span>
      )}
    </label>
  );
}
