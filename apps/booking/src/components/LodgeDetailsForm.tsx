"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

interface Initial {
  id: string;
  name: string;
  description: string;
  village: string;
  district: string;
  altitudeMeters: number | null;
  latitude: number | null;
  longitude: number | null;
  amenities: Record<string, boolean>;
  isActive: boolean;
}

export default function LodgeDetailsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [village, setVillage] = useState(initial.village);
  const [district, setDistrict] = useState(initial.district);
  const [altitude, setAltitude] = useState(
    initial.altitudeMeters?.toString() ?? ""
  );
  const [lat, setLat] = useState(initial.latitude?.toString() ?? "");
  const [lng, setLng] = useState(initial.longitude?.toString() ?? "");
  const [amenities, setAmenities] = useState<Record<string, boolean>>(
    initial.amenities ?? {}
  );
  const [isActive, setIsActive] = useState(initial.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  function toggleAmenity(key: string) {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/lodges/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          village,
          district,
          altitudeMeters: altitude === "" ? null : altitude,
          latitude: lat === "" ? null : lat,
          longitude: lng === "" ? null : lng,
          amenities,
          isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ kind: "error", text: data.error ?? "Save failed" });
      } else {
        setMessage({ kind: "success", text: "Lodge updated." });
        router.refresh();
      }
    } catch {
      setMessage({ kind: "error", text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lodge name" required>
          <input
            required
            type="text"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cls}
          />
        </Field>
        <Field label="Active" hint="Inactive lodges are hidden from trekkers.">
          <label className="mt-1 inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700 dark:text-stone-300">
              {isActive ? "Showing publicly" : "Hidden"}
            </span>
          </label>
        </Field>
      </div>

      <Field label="Description">
        <textarea
          rows={4}
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell trekkers what makes your lodge special — views, food, owner's story…"
          className={cls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Village" required>
          <input
            required
            type="text"
            maxLength={80}
            value={village}
            onChange={(e) => setVillage(e.target.value)}
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
            className={cls}
          />
        </Field>
        <Field label="Altitude (m)">
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Latitude" hint="Decimal degrees (e.g. 27.8064)">
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className={cls}
          />
        </Field>
        <Field label="Longitude" hint="Decimal degrees (e.g. 86.7136)">
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className={cls}
          />
        </Field>
      </div>

      <div>
        <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">Amenities</span>
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

      {message && (
        <p
          className={`text-sm ${
            message.kind === "success" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
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
        <span className="mt-0.5 block text-xs text-stone-400 dark:text-stone-500">{hint}</span>
      )}
    </label>
  );
}
