"use client";

import { useMemo, useState } from "react";
import LodgeCard, { type LodgeCardData } from "@/components/LodgeCard";
import { QUICK_FILTER_AMENITIES } from "@/lib/amenities";

export interface VillageLodge extends LodgeCardData {
  trailPosition: number;
  amenities?: Record<string, boolean> | null;
}

type SortKey = "trail" | "priceAsc" | "ratingDesc" | "rooms";

const SORT_LABELS: Record<SortKey, string> = {
  trail: "Trail order",
  priceAsc: "Price (low to high)",
  ratingDesc: "Rating (high to low)",
  rooms: "Most rooms",
};

const INITIAL_VISIBLE = 6;

export default function VillageLodgeGrid({
  villageName,
  lodges,
}: {
  villageName: string;
  lodges: VillageLodge[];
}) {
  const [sort, setSort] = useState<SortKey>("trail");
  const [activeAmenities, setActiveAmenities] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const showToolbar = lodges.length > 1;

  const filtered = useMemo(() => {
    if (activeAmenities.size === 0) return lodges;
    return lodges.filter((l) => {
      const am = l.amenities ?? {};
      for (const k of activeAmenities) {
        if (!am[k]) return false;
      }
      return true;
    });
  }, [lodges, activeAmenities]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "priceAsc":
        arr.sort((a, b) => (a.minPriceNpr ?? Infinity) - (b.minPriceNpr ?? Infinity));
        break;
      case "ratingDesc":
        arr.sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1));
        break;
      case "rooms":
        arr.sort((a, b) => (b.roomCount ?? 0) - (a.roomCount ?? 0));
        break;
      case "trail":
      default:
        arr.sort((a, b) => a.trailPosition - b.trailPosition);
    }
    return arr;
  }, [filtered, sort]);

  const visible = expanded ? sorted : sorted.slice(0, INITIAL_VISIBLE);
  const hiddenCount = sorted.length - visible.length;

  function toggleAmenity(key: string) {
    setActiveAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setExpanded(false);
  }

  return (
    <div className="mt-4 ml-5 border-l-2 border-emerald-200 pl-8 dark:border-emerald-900">
      {showToolbar && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_FILTER_AMENITIES.map((a) => {
              const active = activeAmenities.has(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => toggleAmenity(a.key)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-emerald-700 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  }`}
                  aria-pressed={active}
                >
                  <span aria-hidden>{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              );
            })}
            {activeAmenities.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveAmenities(new Set())}
                className="ml-1 text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
              >
                Clear
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                setExpanded(false);
              }}
              className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          No lodges in {villageName} match these filters.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((lodge) => (
              <LodgeCard key={lodge.id} lodge={lodge} variant="grid" />
            ))}
          </div>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-4 inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              Show all {sorted.length} lodges in {villageName}
              <span aria-hidden>↓</span>
            </button>
          )}
          {expanded && sorted.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-4 inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Show less
              <span aria-hidden>↑</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
