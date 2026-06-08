"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const AMENITY_OPTIONS: { key: string; label: string; icon: string }[] = [
  { key: "wifi", label: "WiFi", icon: "📶" },
  { key: "hotShower", label: "Hot shower", icon: "🚿" },
  { key: "charging", label: "Charging", icon: "🔌" },
  { key: "restaurant", label: "Restaurant", icon: "🍽️" },
  { key: "bakery", label: "Bakery", icon: "🥐" },
  { key: "heater", label: "Heater", icon: "🔥" },
  { key: "oxygenAvailable", label: "Oxygen", icon: "🫁" },
  { key: "garden", label: "Garden", icon: "🌿" },
  { key: "library", label: "Library", icon: "📚" },
  { key: "bar", label: "Bar", icon: "🍻" },
];

interface Props {
  trekSlug: string;
  resultCount: number;
  totalCount: number;
  amenityCounts: Record<string, number>;
}

export default function TrekFilters({
  trekSlug,
  resultCount,
  totalCount,
  amenityCounts,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const activeAmenities = params.getAll("amenity");
  const maxAltitude = params.get("maxAltitude") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const minRating = params.get("minRating") ?? "";

  const activeFilterCount =
    activeAmenities.length +
    (maxAltitude ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (minRating ? 1 : 0);

  function update(next: URLSearchParams) {
    startTransition(() => {
      router.push(`/treks/${trekSlug}${next.toString() ? `?${next.toString()}` : ""}`);
    });
  }

  function toggleAmenity(key: string) {
    const next = new URLSearchParams(params.toString());
    const current = next.getAll("amenity");
    next.delete("amenity");
    if (current.includes(key)) {
      current.filter((a) => a !== key).forEach((a) => next.append("amenity", a));
    } else {
      [...current, key].forEach((a) => next.append("amenity", a));
    }
    update(next);
  }

  function setNumber(field: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(field, value);
    else next.delete(field);
    update(next);
  }

  function clearAll() {
    update(new URLSearchParams());
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2"
      >
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          Filter lodges
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              {activeFilterCount}
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {resultCount} of {totalCount}
          </span>
          <svg
            className={`h-4 w-4 text-stone-400 transition dark:text-stone-500 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-stone-100 pt-4 dark:border-stone-800">
          {/* Amenities */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Amenities
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const isOn = activeAmenities.includes(a.key);
                const count = amenityCounts[a.key] ?? 0;
                if (count === 0 && !isOn) return null;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => toggleAmenity(a.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
                      isOn
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                    }`}
                  >
                    <span>{a.icon}</span>
                    {a.label}
                    {!isOn && count > 0 && (
                      <span className="text-xs text-stone-400 dark:text-stone-500">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numeric filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Max altitude (m)</span>
              <input
                type="number"
                placeholder="e.g. 4500"
                value={maxAltitude}
                onChange={(e) => setNumber("maxAltitude", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500 dark:[color-scheme:dark]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Max price (NPR/night)</span>
              <input
                type="number"
                placeholder="e.g. 2000"
                value={maxPrice}
                onChange={(e) => setNumber("maxPrice", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500 dark:[color-scheme:dark]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Min rating (★)</span>
              <select
                value={minRating}
                onChange={(e) => setNumber("minRating", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500 dark:[color-scheme:dark]"
              >
                <option value="">Any</option>
                <option value="3">3+ stars</option>
                <option value="4">4+ stars</option>
                <option value="4.5">4.5+ stars</option>
              </select>
            </label>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
