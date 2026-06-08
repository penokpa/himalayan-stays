"use client";

import { useDeferredValue, useMemo, useState } from "react";
import LodgeCard, { type LodgeCardData } from "@/components/LodgeCard";

export interface PickerLodge extends LodgeCardData {
  trailPosition: number;
}

type SortKey = "trail" | "priceAsc" | "ratingDesc" | "rooms" | "alpha";

const SORT_LABELS: Record<SortKey, string> = {
  trail: "Trail order",
  priceAsc: "Price (low to high)",
  ratingDesc: "Rating (high to low)",
  rooms: "Most rooms",
  alpha: "A–Z",
};

export default function VillageLodgePicker({
  villageName,
  lodges,
  selectedLodgeId,
  onSelect,
}: {
  villageName: string;
  lodges: PickerLodge[];
  selectedLodgeId: string;
  onSelect: (lodgeId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("trail");
  const deferredQuery = useDeferredValue(query);
  const showToolbar = lodges.length > 3;

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return lodges;
    return lodges.filter((l) => {
      if (l.name.toLowerCase().includes(q)) return true;
      if (l.description && l.description.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [lodges, deferredQuery]);

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
      case "alpha":
        arr.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "trail":
      default:
        arr.sort((a, b) => a.trailPosition - b.trailPosition);
    }
    // Pin selected to the top
    if (selectedLodgeId) {
      const idx = arr.findIndex((l) => l.id === selectedLodgeId);
      if (idx > 0) {
        const [sel] = arr.splice(idx, 1);
        arr.unshift(sel);
      }
    }
    return arr;
  }, [filtered, sort, selectedLodgeId]);

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-950/40">
      <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2 dark:border-stone-800">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Choose lodge ({lodges.length})
        </p>
      </div>

      {showToolbar && (
        <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-stone-200 bg-stone-50/95 px-3 py-2 backdrop-blur sm:flex-row sm:items-center dark:border-stone-800 dark:bg-stone-950/80">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${villageName} lodges…`}
            className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
          <label className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span className="shrink-0">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
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
        <p className="px-3 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
          No lodges match “{deferredQuery}”.
        </p>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
          {sorted.map((lodge) => (
            <LodgeCard
              key={lodge.id}
              lodge={lodge}
              variant="row"
              selected={selectedLodgeId === lodge.id}
              onSelect={() => onSelect(lodge.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
