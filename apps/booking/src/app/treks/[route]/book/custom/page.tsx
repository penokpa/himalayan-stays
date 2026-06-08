"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useItineraryBuilder, type ItineraryStop } from "../context";
import VillageLodgePicker, { type PickerLodge } from "@/components/VillageLodgePicker";

interface Lodge {
  id: string;
  name: string;
  slug: string;
  village: string;
  altitudeMeters: number | null;
  trailPosition: number;
  description: string | null;
  photo?: string | null;
  amenities?: Record<string, boolean> | null;
  minPriceNpr?: number | null;
  roomCount?: number;
  avgRating?: number | null;
  reviewCount?: number;
}

interface VillageGroup {
  village: string;
  altitude: number | null;
  trailPosition: number; // min trail position among the lodges in this village
  lodges: Lodge[];
}

interface Selection {
  lodgeId: string;
  nights: number;
}

export default function CustomBuilderPage() {
  const { route } = useParams<{ route: string }>();
  const router = useRouter();
  const ctx = useItineraryBuilder();

  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // village name → selection (lodgeId + nights)
  const [selections, setSelections] = useState<Record<string, Selection>>({});

  useEffect(() => {
    if (!ctx.startDate) {
      router.replace(`/treks/${route}/book`);
      return;
    }
    fetch(`/api/lodges?trekRoute=${ctx.trekRoute}&includeMinPrice=true`)
      .then((r) => r.json())
      .then((data: Lodge[]) => setLodges(data))
      .catch(() => setError("Failed to load lodges"))
      .finally(() => setLoading(false));
  }, [ctx.trekRoute, ctx.startDate, route, router]);

  const villages: VillageGroup[] = useMemo(() => {
    const map = new Map<string, VillageGroup>();
    for (const l of lodges) {
      const existing = map.get(l.village);
      if (existing) {
        existing.lodges.push(l);
        existing.trailPosition = Math.min(existing.trailPosition, l.trailPosition);
      } else {
        map.set(l.village, {
          village: l.village,
          altitude: l.altitudeMeters,
          trailPosition: l.trailPosition,
          lodges: [l],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.trailPosition - b.trailPosition);
  }, [lodges]);

  function toggleVillage(village: VillageGroup) {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[village.village]) {
        delete next[village.village];
      } else {
        next[village.village] = { lodgeId: village.lodges[0]?.id ?? "", nights: 1 };
      }
      return next;
    });
  }

  function setLodge(village: string, lodgeId: string) {
    setSelections((prev) => ({
      ...prev,
      [village]: { ...prev[village], lodgeId },
    }));
  }

  function setNights(village: string, nights: number) {
    setSelections((prev) => ({
      ...prev,
      [village]: { ...prev[village], nights: Math.max(1, Math.min(14, nights)) },
    }));
  }

  function handleContinue() {
    const orderedSelections = villages
      .filter((v) => selections[v.village]?.lodgeId)
      .map((v) => ({ village: v, sel: selections[v.village] }));
    if (orderedSelections.length === 0) {
      setError("Pick at least one village to stay at.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    let dayCursor = 1;
    const stops: ItineraryStop[] = orderedSelections.map(({ village, sel }) => {
      const lodge = village.lodges.find((l) => l.id === sel.lodgeId)!;
      const stop: ItineraryStop = {
        dayNumber: dayCursor,
        nights: sel.nights,
        lodgeId: lodge.id,
        lodgeName: lodge.name,
        lodgeVillage: lodge.village,
        lodgeAltitude: lodge.altitudeMeters,
        roomId: "",
        roomName: "",
        roomType: "",
        pricePerNight: 0,
      };
      dayCursor += sel.nights;
      return stop;
    });

    ctx.setStops(stops);
    router.push(`/treks/${route}/book/lodges`);
  }

  const selectedCount = Object.keys(selections).length;
  const totalNights = Object.values(selections).reduce(
    (sum, s) => sum + (s.nights || 0),
    0
  );

  if (loading) {
    return <p className="py-12 text-center text-stone-400">Loading villages…</p>;
  }
  if (error && lodges.length === 0) {
    return <p className="py-12 text-center text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Pick villages along the trail</h2>
        <p className="mt-1 text-sm text-stone-500">
          Tap a village to add it to your trek. Stops follow trail order automatically.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Villages */}
      <div className="space-y-4">
        {villages.map((v, i) => {
          const sel = selections[v.village];
          const isSelected = !!sel;
          return (
            <div
              key={v.village}
              className={`rounded-xl bg-white shadow-sm transition ${
                isSelected ? "ring-2 ring-emerald-600" : "ring-1 ring-stone-200"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleVillage(v)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected ? "bg-emerald-700 text-white" : "bg-stone-200 text-stone-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-stone-900">{v.village}</h3>
                    <p className="text-xs text-stone-500">
                      {v.altitude && `${v.altitude.toLocaleString()}m · `}
                      {v.lodges.length} {v.lodges.length === 1 ? "lodge" : "lodges"}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    isSelected
                      ? "bg-emerald-700 text-white"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {isSelected ? "Selected" : "Add stop"}
                </span>
              </button>

              {isSelected && (
                <div className="space-y-3 border-t border-stone-100 px-5 py-4">
                  <VillageLodgePicker
                    villageName={v.village}
                    lodges={v.lodges.map<PickerLodge>((lodge) => ({
                      id: lodge.id,
                      name: lodge.name,
                      slug: lodge.slug,
                      description: lodge.description,
                      photo: lodge.photo ?? null,
                      amenities: lodge.amenities ?? null,
                      minPriceNpr: lodge.minPriceNpr ?? null,
                      roomCount: lodge.roomCount,
                      avgRating: lodge.avgRating ?? null,
                      reviewCount: lodge.reviewCount,
                      trailPosition: lodge.trailPosition,
                    }))}
                    selectedLodgeId={sel.lodgeId}
                    onSelect={(lodgeId) => setLodge(v.village, lodgeId)}
                  />

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-stone-700">
                      Nights here:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNights(v.village, sel.nights - 1)}
                        disabled={sel.nights <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-40"
                        aria-label="Fewer nights"
                      >
                        −
                      </button>
                      <span className="min-w-[2ch] text-center text-base font-semibold text-stone-900">
                        {sel.nights}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNights(v.village, sel.nights + 1)}
                        disabled={sel.nights >= 14}
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-40"
                        aria-label="More nights"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {selectedCount > 0 && (
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <p className="text-sm text-stone-700">
            <span className="font-semibold">
              {selectedCount} {selectedCount === 1 ? "stop" : "stops"}
            </span>
            {" · "}
            <span className="font-semibold">{totalNights}</span> total nights
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push(`/treks/${route}/book`)}
          className="rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={selectedCount === 0}
          className="flex-1 rounded-lg bg-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Room Selection
        </button>
      </div>
    </div>
  );
}
